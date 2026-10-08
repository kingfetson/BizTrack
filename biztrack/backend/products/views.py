from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, filters
from rest_framework.exceptions import NotFound

from businesses.models import Business
from .models import Category, Product
from .permissions import IsProductReader, IsProductWriter
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    ProductListSerializer,
)


# ----------------------------------------------------------------------------
# Shared base
# ----------------------------------------------------------------------------
class BusinessScopedView:
    """Resolves the business from the URL and applies multi-tenant scoping."""

    def get_business(self):
        business_pk = self.kwargs["business_pk"]
        # Scoped to the user's memberships - non-members get 404
        return get_object_or_404(
            Business.objects.filter(members__user=self.request.user).distinct(),
            pk=business_pk,
        )


# ----------------------------------------------------------------------------
# Categories
# ----------------------------------------------------------------------------
class CategoryListCreateView(BusinessScopedView, generics.ListCreateAPIView):
    """
    GET  /api/businesses/<business_pk>/categories/
    POST /api/businesses/<business_pk>/categories/
    """
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsProductReader, IsProductWriter]
    pagination_class = None  # categories are few, return all

    def get_queryset(self):
        business = self.get_business()
        return (
            Category.objects
            .filter(business=business)
            .annotate(product_count=Count("products"))
            .order_by("name")
        )

    def perform_create(self, serializer):
        business = self.get_business()
        serializer.save(business=business)


class CategoryDetailView(BusinessScopedView, generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PATCH / PUT / DELETE /api/businesses/<business_pk>/categories/<pk>/
    """
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsProductReader, IsProductWriter]

    def get_queryset(self):
        business = self.get_business()
        return Category.objects.filter(business=business).annotate(
            product_count=Count("products")
        )


# ----------------------------------------------------------------------------
# Products
# ----------------------------------------------------------------------------
class ProductListCreateView(BusinessScopedView, generics.ListCreateAPIView):
    """
    GET  /api/businesses/<business_pk>/products/
    POST /api/businesses/<business_pk>/products/
    """
    permission_classes = [permissions.IsAuthenticated, IsProductReader, IsProductWriter]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "sku", "barcode", "description"]
    ordering_fields = ["name", "price", "cost", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        business = self.get_business()
        qs = Product.objects.filter(business=business).select_related("category")

        # Optional query params
        category = self.request.query_params.get("category")
        is_active = self.request.query_params.get("is_active")

        if category:
            qs = qs.filter(category_id=category)
        if is_active is not None:
            is_active_bool = is_active.lower() in ("true", "1", "yes")
            qs = qs.filter(is_active=is_active_bool)

        return qs

    def get_serializer_class(self):
        return ProductListSerializer if self.request.method == "GET" else ProductSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["business"] = self.get_business()
        return ctx

    def perform_create(self, serializer):
        business = self.get_business()
        serializer.save(business=business)


class ProductDetailView(BusinessScopedView, generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PATCH / PUT / DELETE /api/businesses/<business_pk>/products/<pk>/
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated, IsProductReader, IsProductWriter]

    def get_queryset(self):
        business = self.get_business()
        return Product.objects.filter(business=business).select_related("category")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["business"] = self.get_business()
        return ctx