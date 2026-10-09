from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from businesses.models import Business, BusinessMember
from customers.models import Customer, Supplier
from products.models import Product
from products.services import adjust_stock
from purchases.services import record_purchase
from sales.services import record_sale
from .views import _date_range

User = get_user_model()


class ReportTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(email="owner@biztrack.local", password="StrongPass123!")
        self.staff = User.objects.create_user(email="staff@biztrack.local", password="StrongPass123!")
        self.outsider = User.objects.create_user(email="outsider@biztrack.local", password="StrongPass123!")

        self.business = Business.objects.create(name="Shop", currency="KES")
        BusinessMember.objects.create(user=self.owner, business=self.business, role="OWNER")
        BusinessMember.objects.create(user=self.staff, business=self.business, role="STAFF")

        self.other_business = Business.objects.create(name="Other", currency="KES")
        BusinessMember.objects.create(user=self.outsider, business=self.other_business, role="OWNER")

        # Two products with known price/cost
        self.product_a = Product.objects.create(
            business=self.business, name="Coke", sku="C",
            price=Decimal("100.00"), cost=Decimal("60.00"),
        )
        self.product_b = Product.objects.create(
            business=self.business, name="Fanta", sku="F",
            price=Decimal("80.00"), cost=Decimal("50.00"),
        )

        self._login("owner@biztrack.local")

    def _login(self, email):
        resp = self.client.post(reverse("login"), {"email": email, "password": "StrongPass123!"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    def _url(self, name):
        return reverse(name, args=[self.business.id])

    # ------------------------------------------------------------------
    # Date range helper
    # ------------------------------------------------------------------

    def test_date_range_defaults_to_last_30_days(self):
        class FakeReq:
            query_params = {}
        start, end = _date_range(FakeReq())
        delta = (end - start).days
        self.assertEqual(delta, 29)  # 30 days inclusive

    # ------------------------------------------------------------------
    # Sales Summary
    # ------------------------------------------------------------------

    def test_sales_summary_empty(self):
        resp = self.client.get(self._url("report-sales-summary"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["total_revenue"], "0.00")
        self.assertEqual(resp.data["sale_count"], 0)
        self.assertEqual(len(resp.data["daily"]), 0)

    def test_sales_summary_with_sales(self):
        # Give stock
        adjust_stock(product=self.product_a, delta=50, reason="PURCHASE", note="setup")
        adjust_stock(product=self.product_b, delta=50, reason="PURCHASE", note="setup")

        # Two sales: 3 x 100 = 300 and 2 x 80 = 160
        record_sale(
            business=self.business,
            items_data=[{"product_id": self.product_a.id, "quantity": 3, "unit_price": "100.00"}],
            user=self.owner,
            payment_method="CASH",
        )
        record_sale(
            business=self.business,
            items_data=[{"product_id": self.product_b.id, "quantity": 2, "unit_price": "80.00"}],
            user=self.owner,
            payment_method="MPESA",
        )

        resp = self.client.get(self._url("report-sales-summary"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Decimal(resp.data["total_revenue"]), Decimal("460.00"))
        self.assertEqual(resp.data["sale_count"], 2)
        self.assertEqual(resp.data["item_count"], 5)  # 3 + 2

        # Payment methods
        methods = {m["method"]: m for m in resp.data["payment_methods"]}
        self.assertEqual(Decimal(methods["CASH"]["revenue"]), Decimal("300.00"))
        self.assertEqual(Decimal(methods["MPESA"]["revenue"]), Decimal("160.00"))

        # Top products
        top = {p["name"]: p for p in resp.data["top_products"]}
        self.assertEqual(top["Coke"]["quantity"], 3)
        self.assertEqual(Decimal(top["Coke"]["revenue"]), Decimal("300.00"))

    def test_sales_summary_excludes_voided(self):
        adjust_stock(product=self.product_a, delta=50, reason="PURCHASE", note="setup")

        sale = record_sale(
            business=self.business,
            items_data=[{"product_id": self.product_a.id, "quantity": 2, "unit_price": "100.00"}],
            user=self.owner,
        )
        # Void it
        from sales.services import void_sale
        void_sale(sale, user=self.owner, reason="test")

        resp = self.client.get(self._url("report-sales-summary"))
        self.assertEqual(Decimal(resp.data["total_revenue"]), Decimal("0.00"))
        self.assertEqual(resp.data["sale_count"], 0)

    def test_sales_summary_respects_date_range(self):
        adjust_stock(product=self.product_a, delta=100, reason="PURCHASE", note="setup")
        # Sale today
        record_sale(
            business=self.business,
            items_data=[{"product_id": self.product_a.id, "quantity": 1, "unit_price": "100.00"}],
            user=self.owner,
        )
        # Sale 60 days ago (out of default range)
        old_sale = record_sale(
            business=self.business,
            items_data=[{"product_id": self.product_a.id, "quantity": 5, "unit_price": "100.00"}],
            user=self.owner,
        )
        old_sale.created_at = timezone.now() - timedelta(days=60)
        old_sale.save(update_fields=["created_at"])

        resp = self.client.get(self._url("report-sales-summary"))
        # Default range = last 30 days → only the recent sale
        self.assertEqual(resp.data["sale_count"], 1)
        self.assertEqual(Decimal(resp.data["total_revenue"]), Decimal("100.00"))

    # ------------------------------------------------------------------
    # Inventory Report
    # ------------------------------------------------------------------

    def test_inventory_report_empty(self):
        resp = self.client.get(self._url("report-inventory"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["total_products"], 2)  # both products exist
        self.assertEqual(resp.data["total_units"], 0)
        self.assertEqual(Decimal(resp.data["total_value_at_cost"]), Decimal("0.00"))

    def test_inventory_report_with_stock(self):
        adjust_stock(product=self.product_a, delta=10, reason="PURCHASE", note="setup")
        adjust_stock(product=self.product_b, delta=20, reason="PURCHASE", note="setup")

        resp = self.client.get(self._url("report-inventory"))
        self.assertEqual(resp.data["total_units"], 30)
        # 10 * 60 + 20 * 50 = 1600 cost
        self.assertEqual(Decimal(resp.data["total_value_at_cost"]), Decimal("1600.00"))
        # 10 * 100 + 20 * 80 = 2600 price
        self.assertEqual(Decimal(resp.data["total_value_at_price"]), Decimal("2600.00"))
        # potential profit = 1000
        self.assertEqual(Decimal(resp.data["potential_profit"]), Decimal("1000.00"))

    def test_inventory_flags_out_of_stock(self):
        # product_a has 0 (default stock level), product_b has 5
        adjust_stock(product=self.product_b, delta=5, reason="PURCHASE", note="setup")

        resp = self.client.get(self._url("report-inventory"))
        self.assertEqual(resp.data["low_stock_count"], 1)  # only product_b is in "low" bucket (product_a is out_of_stock)
        self.assertEqual(len(resp.data["out_of_stock_items"]), 1)
        self.assertEqual(resp.data["out_of_stock_items"][0]["sku"], "C")
        self.assertEqual(len(resp.data["low_stock_items"]), 1)
        self.assertEqual(resp.data["low_stock_items"][0]["sku"], "F")

    # ------------------------------------------------------------------
    # Purchases Summary
    # ------------------------------------------------------------------

    def test_purchases_summary_empty(self):
        resp = self.client.get(self._url("report-purchases-summary"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Decimal(resp.data["total_spend"]), Decimal("0.00"))
        self.assertEqual(resp.data["purchase_count"], 0)

    def test_purchases_summary_with_purchases(self):
        supplier = Supplier.objects.create(business=self.business, name="Kenyatta")

        # Purchase 1: paid, 20 x 60 = 1200
        record_purchase(
            business=self.business,
            items_data=[{"product_id": self.product_a.id, "quantity": 20, "unit_cost": "60.00"}],
            user=self.owner,
            supplier=supplier,
            is_paid=True,
        )
        # Purchase 2: unpaid, 10 x 50 = 500
        record_purchase(
            business=self.business,
            items_data=[{"product_id": self.product_b.id, "quantity": 10, "unit_cost": "50.00"}],
            user=self.owner,
            supplier=supplier,
            is_paid=False,
        )

        resp = self.client.get(self._url("report-purchases-summary"))
        self.assertEqual(Decimal(resp.data["total_spend"]), Decimal("1700.00"))
        self.assertEqual(resp.data["purchase_count"], 2)
        self.assertEqual(Decimal(resp.data["unpaid_total"]), Decimal("500.00"))

        # By supplier
        self.assertEqual(len(resp.data["by_supplier"]), 1)
        self.assertEqual(resp.data["by_supplier"][0]["supplier"], "Kenyatta")
        self.assertEqual(Decimal(resp.data["by_supplier"][0]["total"]), Decimal("1700.00"))

    # ------------------------------------------------------------------
    # Profit Report
    # ------------------------------------------------------------------

    def test_profit_report_empty(self):
        resp = self.client.get(self._url("report-profit"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Decimal(resp.data["revenue"]), Decimal("0.00"))
        self.assertEqual(Decimal(resp.data["cost_of_goods_sold"]), Decimal("0.00"))
        self.assertEqual(resp.data["margin_percent"], 0.0)

    def test_profit_report_calculation(self):
        adjust_stock(product=self.product_a, delta=50, reason="PURCHASE", note="setup")

        # Sell 10 x 100 = 1000 revenue; cost = 10 x 60 = 600; profit = 400
        record_sale(
            business=self.business,
            items_data=[{"product_id": self.product_a.id, "quantity": 10, "unit_price": "100.00"}],
            user=self.owner,
        )

        resp = self.client.get(self._url("report-profit"))
        self.assertEqual(Decimal(resp.data["revenue"]), Decimal("1000.00"))
        self.assertEqual(Decimal(resp.data["cost_of_goods_sold"]), Decimal("600.00"))
        self.assertEqual(Decimal(resp.data["gross_profit"]), Decimal("400.00"))
        self.assertEqual(resp.data["margin_percent"], 40.0)

        # By product
        self.assertEqual(len(resp.data["by_product"]), 1)
        self.assertEqual(resp.data["by_product"][0]["name"], "Coke")
        self.assertEqual(resp.data["by_product"][0]["units_sold"], 10)

    # ------------------------------------------------------------------
    # Isolation + roles
    # ------------------------------------------------------------------

    def test_outsider_cannot_access_reports(self):
        self._login("outsider@biztrack.local")
        for name in ["report-sales-summary", "report-inventory",
                     "report-purchases-summary", "report-profit"]:
            resp = self.client.get(self._url(name))
            self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND,
                             f"{name} should 404 for outsider")

    def test_staff_can_read_reports(self):
        self._login("staff@biztrack.local")
        for name in ["report-sales-summary", "report-inventory",
                     "report-purchases-summary", "report-profit"]:
            resp = self.client.get(self._url(name))
            self.assertEqual(resp.status_code, 200,
                             f"{name} should be readable by staff")