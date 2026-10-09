from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, F, Sum, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from businesses.models import Business
from customers.models import Supplier
from products.models import Product, StockLevel
from purchases.models import Purchase, PurchaseItem
from sales.models import Sale, SaleItem


class BusinessScopedView:
    """Resolve the business from URL, scoped to the user's memberships."""

    def get_business(self):
        business_pk = self.kwargs["business_pk"]
        return get_object_or_404(
            Business.objects.filter(members__user=self.request.user).distinct(),
            pk=business_pk,
        )


def _date_range(request):
    """
    Parse ?start=YYYY-MM-DD and ?end=YYYY-MM-DD.
    Default: last 30 days, ending today.
    """
    today = date.today()
    start_str = request.query_params.get("start")
    end_str = request.query_params.get("end")

    try:
        start = date.fromisoformat(start_str) if start_str else today - timedelta(days=29)
    except ValueError:
        start = today - timedelta(days=29)
    try:
        end = date.fromisoformat(end_str) if end_str else today
    except ValueError:
        end = today

    if start > end:
        start, end = end, start

    return start, end


def _completed_sales_qs(business, start, end):
    """Completed sales within [start, end] inclusive."""
    return Sale.objects.filter(
        business=business,
        status=Sale.Status.COMPLETED,
        created_at__date__gte=start,
        created_at__date__lte=end,
    )


# ----------------------------------------------------------------------------
# 1. Sales Summary
# ----------------------------------------------------------------------------
class SalesSummaryView(BusinessScopedView, APIView):
    """GET /api/businesses/<business_pk>/reports/sales-summary/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_pk):
        business = self.get_business()
        start, end = _date_range(request)

        sales = _completed_sales_qs(business, start, end)

        # Totals
        totals = sales.aggregate(
            total_revenue=Sum("total"),
            sale_count=Count("id", distinct=True),
        )
        total_revenue = totals["total_revenue"] or Decimal("0.00")
        sale_count = totals["sale_count"] or 0
        avg = (total_revenue / sale_count).quantize(Decimal("0.01")) if sale_count else Decimal("0.00")

        # Item count
        item_count = SaleItem.objects.filter(sale__in=sales).aggregate(
            n=Sum("quantity")
        )["n"] or 0

        # Daily breakdown
        daily_qs = (
            sales.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(revenue=Sum("total"), count=Count("id"))
            .order_by("day")
        )
        daily = [
            {
                "date": row["day"].isoformat(),
                "revenue": str(row["revenue"] or 0),
                "count": row["count"],
            }
            for row in daily_qs
        ]

        # Top products (by quantity sold)
        top_products_qs = (
            SaleItem.objects.filter(sale__in=sales)
            .values("product__id", "product_name")
            .annotate(
                quantity=Sum("quantity"),
                revenue=Sum("subtotal"),
            )
            .order_by("-quantity")[:10]
        )
        top_products = [
            {
                "product_id": row["product__id"],
                "name": row["product_name"],
                "quantity": row["quantity"],
                "revenue": str(row["revenue"] or 0),
            }
            for row in top_products_qs
        ]

        # Payment method breakdown
        payment_qs = (
            sales.values("payment_method")
            .annotate(revenue=Sum("total"), count=Count("id"))
            .order_by("-revenue")
        )
        payment_methods = [
            {
                "method": row["payment_method"],
                "revenue": str(row["revenue"] or 0),
                "count": row["count"],
            }
            for row in payment_qs
        ]

        return Response({
            "range": {"start": start.isoformat(), "end": end.isoformat()},
            "total_revenue": str(total_revenue),
            "sale_count": sale_count,
            "item_count": item_count,
            "avg_sale_value": str(avg),
            "daily": daily,
            "top_products": top_products,
            "payment_methods": payment_methods,
        })


# ----------------------------------------------------------------------------
# 2. Inventory Report
# ----------------------------------------------------------------------------
class InventoryReportView(BusinessScopedView, APIView):
    """GET /api/businesses/<business_pk>/reports/inventory/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_pk):
        business = self.get_business()

        # All active products with their stock level
        products = (
            Product.objects.filter(business=business)
            .select_related("stock", "category")
        )

        total_units = 0
        total_cost_value = Decimal("0.00")
        total_price_value = Decimal("0.00")
        low_stock = []
        out_of_stock = []

        for p in products:
            qty = p.stock.quantity if p.stock else 0
            total_units += qty
            total_cost_value += Decimal(qty) * p.cost
            total_price_value += Decimal(qty) * p.price

            if qty == 0:
                out_of_stock.append({
                    "product_id": p.id,
                    "name": p.name,
                    "sku": p.sku,
                    "category": p.category.name if p.category else None,
                })
            elif qty <= (p.stock.low_stock_threshold if p.stock else 5):
                low_stock.append({
                    "product_id": p.id,
                    "name": p.name,
                    "sku": p.sku,
                    "quantity": qty,
                    "threshold": p.stock.low_stock_threshold if p.stock else 5,
                })

        return Response({
            "total_products": products.count(),
            "total_units": total_units,
            "total_value_at_cost": str(total_cost_value.quantize(Decimal("0.01"))),
            "total_value_at_price": str(total_price_value.quantize(Decimal("0.01"))),
            "potential_profit": str((total_price_value - total_cost_value).quantize(Decimal("0.01"))),
            "low_stock_count": len(low_stock),
            "low_stock_items": low_stock[:50],  # cap at 50 for response size
            "out_of_stock_items": out_of_stock[:50],
        })


# ----------------------------------------------------------------------------
# 3. Purchases Summary
# ----------------------------------------------------------------------------
class PurchasesSummaryView(BusinessScopedView, APIView):
    """GET /api/businesses/<business_pk>/reports/purchases-summary/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_pk):
        business = self.get_business()
        start, end = _date_range(request)

        purchases = Purchase.objects.filter(
            business=business,
            status=Purchase.Status.COMPLETED,
            created_at__date__gte=start,
            created_at__date__lte=end,
        )

        totals = purchases.aggregate(
            total_spend=Sum("total"),
            purchase_count=Count("id", distinct=True),
        )
        total_spend = totals["total_spend"] or Decimal("0.00")
        purchase_count = totals["purchase_count"] or 0

        # Unpaid
        unpaid = purchases.filter(is_paid=False).aggregate(
            n=Sum("total"),
        )["n"] or Decimal("0.00")

        # By supplier
        by_supplier_qs = (
            purchases
            .values("supplier_name")
            .annotate(total=Sum("total"), count=Count("id"))
            .order_by("-total")[:20]
        )
        by_supplier = [
            {
                "supplier": row["supplier_name"] or "Ad-hoc",
                "total": str(row["total"] or 0),
                "count": row["count"],
            }
            for row in by_supplier_qs
        ]

        # Monthly
        monthly_qs = (
            purchases
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(total=Sum("total"), count=Count("id"))
            .order_by("month")
        )
        monthly = [
            {
                "month": row["month"].strftime("%Y-%m"),
                "total": str(row["total"] or 0),
                "count": row["count"],
            }
            for row in monthly_qs
        ]

        return Response({
            "range": {"start": start.isoformat(), "end": end.isoformat()},
            "total_spend": str(total_spend),
            "purchase_count": purchase_count,
            "unpaid_total": str(unpaid),
            "by_supplier": by_supplier,
            "monthly": monthly,
        })


# ----------------------------------------------------------------------------
# 4. Profit Report
# ----------------------------------------------------------------------------
class ProfitReportView(BusinessScopedView, APIView):
    """GET /api/businesses/<business_pk>/reports/profit/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, business_pk):
        business = self.get_business()
        start, end = _date_range(request)

        sales = _completed_sales_qs(business, start, end)

        # Revenue = sum of SaleItem.subtotal for completed sales in range
        revenue = SaleItem.objects.filter(sale__in=sales).aggregate(
            total=Sum("subtotal")
        )["total"] or Decimal("0.00")

        # COGS = sum of SaleItem.quantity * product.cost
        # NOTE: uses the product's CURRENT cost, not the cost at time of sale.
        # This is an approximation. Future stage could snapshot cost on SaleItem.
        cogs = SaleItem.objects.filter(sale__in=sales).aggregate(
            total=Sum(F("quantity") * F("product__cost"))
        )["total"] or Decimal("0.00")

        gross_profit = revenue - cogs
        margin = (
            (gross_profit / revenue * 100).quantize(Decimal("0.01"))
            if revenue > 0
            else Decimal("0.00")
        )

        # Per-product profit
        by_product_qs = (
            SaleItem.objects.filter(sale__in=sales)
            .values("product__id", "product_name")
            .annotate(
                units_sold=Sum("quantity"),
                revenue=Sum("subtotal"),
                cost=Sum(F("quantity") * F("product__cost")),
            )
            .order_by("-revenue")[:20]
        )
        by_product = []
        for row in by_product_qs:
            rev = row["revenue"] or Decimal("0.00")
            cost = row["cost"] or Decimal("0.00")
            profit = rev - cost
            row_margin = (profit / rev * 100).quantize(Decimal("0.01")) if rev > 0 else Decimal("0.00")
            by_product.append({
                "product_id": row["product__id"],
                "name": row["product_name"],
                "units_sold": row["units_sold"],
                "revenue": str(rev),
                "cost": str(cost),
                "profit": str(profit),
                "margin_percent": float(row_margin),
            })

        return Response({
            "range": {"start": start.isoformat(), "end": end.isoformat()},
            "revenue": str(revenue),
            "cost_of_goods_sold": str(cogs),
            "gross_profit": str(gross_profit),
            "margin_percent": float(margin),
            "by_product": by_product,
        })