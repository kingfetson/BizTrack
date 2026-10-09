from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView

from businesses.models import Business
from customers.models import Customer
from .models import Sale
from .permissions import IsBusinessMember, IsSaleVoider
from .serializers import (
    SaleSerializer,
    CreateSaleSerializer,
    VoidSaleSerializer,
)
from .services import record_sale, void_sale, SaleError


class BusinessScopedView:
    """Resolves the business from URL and applies multi-tenant scoping."""

    def get_business(self):
        business_pk = self.kwargs["business_pk"]
        return get_object_or_404(
            Business.objects.filter(members__user=self.request.user).distinct(),
            pk=business_pk,
        )


class SaleListCreateView(BusinessScopedView, generics.ListCreateAPIView):
    """
    GET  /api/businesses/<business_pk>/sales/
    POST /api/businesses/<business_pk>/sales/
    """
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["customer_name", "customer_phone", "note"]
    ordering_fields = ["created_at", "total"]
    ordering = ["-created_at"]

    def get_queryset(self):
        business = self.get_business()
        qs = Sale.objects.filter(business=business).prefetch_related("items")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        payment = self.request.query_params.get("payment_method")
        if payment:
            qs = qs.filter(payment_method=payment)

        customer = self.request.query_params.get("customer")
        if customer:
            qs = qs.filter(customer_id=customer)

        return qs

    def create(self, request, *args, **kwargs):
        business = self.get_business()
        serializer = CreateSaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        customer = None
        customer_id = serializer.validated_data.get("customer_id")
        if customer_id:
            customer = Customer.objects.filter(
                business=business, pk=customer_id
            ).first()
            if customer is None:
                return Response(
                    {"detail": "Customer not found in this business."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            sale = record_sale(
                business=business,
                items_data=serializer.validated_data["items"],
                user=request.user,
                payment_method=serializer.validated_data["payment_method"],
                customer=customer,
                customer_name=serializer.validated_data.get("customer_name", ""),
                customer_phone=serializer.validated_data.get("customer_phone", ""),
                note=serializer.validated_data.get("note", ""),
            )
        except SaleError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        sale = Sale.objects.prefetch_related("items").get(pk=sale.pk)
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)


class SaleDetailView(BusinessScopedView, generics.RetrieveAPIView):
    """GET /api/businesses/<business_pk>/sales/<pk>/"""
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]

    def get_queryset(self):
        business = self.get_business()
        return Sale.objects.filter(business=business).prefetch_related("items")


class SaleVoidView(BusinessScopedView, APIView):
    """POST /api/businesses/<business_pk>/sales/<pk>/void/"""
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember, IsSaleVoider]

    def post(self, request, business_pk, pk):
        business = self.get_business()
        sale = get_object_or_404(
            Sale.objects.filter(business=business).prefetch_related("items"),
            pk=pk,
        )

        serializer = VoidSaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            void_sale(sale, user=request.user, reason=serializer.validated_data.get("reason", ""))
        except SaleError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        sale.refresh_from_db()
        return Response(SaleSerializer(sale).data, status=status.HTTP_200_OK)