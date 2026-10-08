from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, filters, status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from businesses.models import Business
from .models import Category, Product, StockLevel, StockMovement
from .permissions import IsProductReader, IsProductWriter
from .services import adjust_stock
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    ProductListSerializer,
    StockLevelSerializer,
    StockMovementSerializer,
    AdjustStockSerializer,
)


class BusinessScopedView:
    """Resolves the business from the URL and applies multi-tenant scoping."""

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


# ----------------------------------------------------------------------------
# Categories
# ----------------------------------------------------------------------------
class CategoryListCreateView(BusinessScopedView, generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsProductReader, IsProductWriter]
    pagination_class = None

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
    permission_classes = [permissions.IsAuthenticated, IsProductReader, IsProductWriter]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "sku", "barcode", "description"]
    ordering_fields = ["name", "price", "cost", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        business = self.get_business()
        qs = Product.objects.filter(business=business).select_related("category")

        category = self.request.query_params.get("category")
        is_active = self.request.query_params.get("is_active")

        if category:
            qs = qs.filter(category_id=category)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ("true", "1", "yes"))

        return qs

    def get_serializer_class(self):
        return ProductListSerializer if self.request.method == "GET" else ProductSerializer

    def perform_create(self, serializer):
        business = self.get_business()
        serializer.save(business=business)


class ProductDetailView(BusinessScopedView, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated, IsProductReader, IsProductWriter]

    def get_queryset(self):
        business = self.get_business()
        return Product.objects.filter(business=business).select_related("category")


# ----------------------------------------------------------------------------
# Stock
# ----------------------------------------------------------------------------
class StockDetailView(BusinessScopedView, generics.RetrieveAPIView):
    serializer_class = StockLevelSerializer
    permission_classes = [permissions.IsAuthenticated, IsProductReader]

    def get_object(self):
        business = self.get_business()
        product = get_object_or_404(
            Product.objects.filter(business=business),
            pk=self.kwargs["pk"],
        )
        return product.stock


class StockAdjustView(BusinessScopedView, generics.GenericAPIView):
    serializer_class = AdjustStockSerializer
    permission_classes = [permissions.IsAuthenticated, IsProductReader, IsProductWriter]

    def post(self, request, business_pk, pk):
        business = self.get_business()
        product = get_object_or_404(
            Product.objects.filter(business=business),
            pk=pk,
        )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            level = adjust_stock(
                product=product,
                delta=serializer.validated_data["delta"],
                reason=serializer.validated_data["reason"],
                note=serializer.validated_data.get("note", ""),
                user=request.user,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(StockLevelSerializer(level).data, status=status.HTTP_200_OK)


class StockMovementListView(BusinessScopedView, generics.ListAPIView):
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated, IsProductReader]

    def get_queryset(self):
        business = self.get_business()
        product = get_object_or_404(
            Product.objects.filter(business=business),
            pk=self.kwargs["pk"],
        )
        qs = StockMovement.objects.filter(product=product).select_related("created_by")

        reason = self.request.query_params.get("reason")
        if reason:
            qs = qs.filter(reason=reason)

        return qs

    def get_paginate_by(self):
        limit = self.request.query_params.get("limit")
        try:
            return int(limit) if limit else 50
        except (TypeError, ValueError):
            return 50