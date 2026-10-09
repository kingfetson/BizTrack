from django.db.models import Count, Max, Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, filters

from businesses.models import Business
from .models import Customer, Supplier
from .permissions import IsCustomerReader, IsCustomerWriter
from .serializers import (
    CustomerSerializer,
    CustomerListSerializer,
    SupplierSerializer,
)


class BusinessScopedView:
    """Resolves the business from URL and applies multi-tenant scoping."""

    def get_business(self):
        business_pk = self.kwargs["business_pk"]
        return get_object_or_404(
            Business.objects.filter(members__user=self.request.user).distinct(),
            pk=business_pk,
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        try:
            ctx["business"] = self.get_business()
        except Exception:
            pass
        return ctx


def _with_sale_stats(queryset):
    """
    Annotate a customer queryset with sales-based stats.
    Stats reflect only COMPLETED sales (voided sales don't count).
    """
    return queryset.annotate(
        total_spent=Sum(
            "sales__total",
            filter=Q(sales__status="COMPLETED"),
            default=0,
        ),
        sale_count=Count(
            "sales",
            filter=Q(sales__status="COMPLETED"),
            distinct=True,
        ),
        last_purchase_at=Max(
            "sales__created_at",
            filter=Q(sales__status="COMPLETED"),
        ),
    )


# ----------------------------------------------------------------------------
# Customers
# ----------------------------------------------------------------------------
class CustomerListCreateView(BusinessScopedView, generics.ListCreateAPIView):
    """
    GET  /api/businesses/<business_pk>/customers/
    POST /api/businesses/<business_pk>/customers/
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomerReader, IsCustomerWriter]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "phone", "email"]
    ordering_fields = ["name", "created_at", "total_spent", "sale_count"]
    ordering = ["name"]

    def get_queryset(self):
        business = self.get_business()
        qs = Customer.objects.filter(business=business)
        qs = _with_sale_stats(qs)

        # Optional filter: only customers with at least one completed sale
        with_sales = self.request.query_params.get("with_sales")
        if with_sales in ("true", "1", "yes"):
            qs = qs.filter(sale_count__gt=0)

        return qs

    def get_serializer_class(self):
        return CustomerListSerializer if self.request.method == "GET" else CustomerSerializer

    def perform_create(self, serializer):
        serializer.save(business=self.get_business())


class CustomerDetailView(BusinessScopedView, generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PATCH / PUT / DELETE /api/businesses/<business_pk>/customers/<pk>/
    """
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerReader, IsCustomerWriter]

    def get_queryset(self):
        business = self.get_business()
        qs = Customer.objects.filter(business=business)
        return _with_sale_stats(qs)


# ----------------------------------------------------------------------------
# Suppliers
# ----------------------------------------------------------------------------
class SupplierListCreateView(BusinessScopedView, generics.ListCreateAPIView):
    """
    GET  /api/businesses/<business_pk>/suppliers/
    POST /api/businesses/<business_pk>/suppliers/
    """
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerReader, IsCustomerWriter]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "phone", "email"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        business = self.get_business()
        return Supplier.objects.filter(business=business)

    def perform_create(self, serializer):
        serializer.save(business=self.get_business())


class SupplierDetailView(BusinessScopedView, generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PATCH / PUT / DELETE /api/businesses/<business_pk>/suppliers/<pk>/
    """
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerReader, IsCustomerWriter]

    def get_queryset(self):
        business = self.get_business()
        return Supplier.objects.filter(business=business)