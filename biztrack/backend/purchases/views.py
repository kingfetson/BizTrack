from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView

from businesses.models import Business
from customers.models import Supplier
from .models import Purchase
from .permissions import IsPurchaseReader, IsPurchaseWriter
from .serializers import (
    PurchaseSerializer,
    CreatePurchaseSerializer,
    VoidPurchaseSerializer,
)
from .services import record_purchase, void_purchase, PurchaseError


class BusinessScopedView:
    """Resolves the business from URL and applies multi-tenant scoping."""

    def get_business(self):
        business_pk = self.kwargs["business_pk"]
        return get_object_or_404(
            Business.objects.filter(members__user=self.request.user).distinct(),
            pk=business_pk,
        )


class PurchaseListCreateView(BusinessScopedView, generics.ListCreateAPIView):
    """
    GET  /api/businesses/<business_pk>/purchases/
    POST /api/businesses/<business_pk>/purchases/
    """
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated, IsPurchaseReader, IsPurchaseWriter]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["supplier_name", "supplier_phone", "note"]
    ordering_fields = ["created_at", "total"]
    ordering = ["-created_at"]

    def get_queryset(self):
        business = self.get_business()
        qs = Purchase.objects.filter(business=business).prefetch_related("items")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        is_paid = self.request.query_params.get("is_paid")
        if is_paid is not None:
            qs = qs.filter(is_paid=is_paid.lower() in ("true", "1", "yes"))

        supplier = self.request.query_params.get("supplier")
        if supplier:
            qs = qs.filter(supplier_id=supplier)

        return qs

    def create(self, request, *args, **kwargs):
        business = self.get_business()
        serializer = CreatePurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        supplier = None
        supplier_id = serializer.validated_data.get("supplier_id")
        if supplier_id:
            supplier = Supplier.objects.filter(
                business=business, pk=supplier_id
            ).first()
            if supplier is None:
                return Response(
                    {"detail": "Supplier not found in this business."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            purchase = record_purchase(
                business=business,
                items_data=serializer.validated_data["items"],
                user=request.user,
                supplier=supplier,
                supplier_name=serializer.validated_data.get("supplier_name", ""),
                supplier_phone=serializer.validated_data.get("supplier_phone", ""),
                is_paid=serializer.validated_data.get("is_paid", False),
                note=serializer.validated_data.get("note", ""),
            )
        except PurchaseError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        purchase = Purchase.objects.prefetch_related("items").get(pk=purchase.pk)
        return Response(PurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)


class PurchaseDetailView(BusinessScopedView, generics.RetrieveAPIView):
    """GET /api/businesses/<business_pk>/purchases/<pk>/"""
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated, IsPurchaseReader]

    def get_queryset(self):
        business = self.get_business()
        return Purchase.objects.filter(business=business).prefetch_related("items")


class PurchaseVoidView(BusinessScopedView, APIView):
    """POST /api/businesses/<business_pk>/purchases/<pk>/void/"""
    permission_classes = [permissions.IsAuthenticated, IsPurchaseReader, IsPurchaseWriter]

    def post(self, request, business_pk, pk):
        business = self.get_business()
        purchase = get_object_or_404(
            Purchase.objects.filter(business=business).prefetch_related("items"),
            pk=pk,
        )

        serializer = VoidPurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            void_purchase(
                purchase,
                user=request.user,
                reason=serializer.validated_data.get("reason", ""),
            )
        except PurchaseError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        purchase.refresh_from_db()
        return Response(PurchaseSerializer(purchase).data, status=status.HTTP_200_OK)