from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Business, BusinessMember
from .permissions import IsBusinessMember, IsBusinessOwnerOrAdmin
from .serializers import (
    BusinessSerializer,
    BusinessMemberSerializer,
    AddMemberSerializer,
)


class BusinessListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/businesses/   - list businesses the user belongs to
    POST /api/businesses/   - create a new business (creator becomes OWNER)
    """
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Business.objects.filter(members__user=self.request.user).distinct()

    @transaction.atomic
    def perform_create(self, serializer):
        business = serializer.save()
        BusinessMember.objects.create(
            user=self.request.user,
            business=business,
            role=BusinessMember.Role.OWNER,
        )


class BusinessDetailView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH/PUT /api/businesses/<pk>/
    Only accessible to members of that business.
    """
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Business.objects.filter(members__user=self.request.user).distinct()


class BusinessMemberListView(generics.ListAPIView):
    """GET /api/businesses/<business_pk>/members/"""
    serializer_class = BusinessMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]

    def get_queryset(self):
        return BusinessMember.objects.filter(
            business_id=self.kwargs["business_pk"]
        ).select_related("user")


class BusinessMemberAddView(APIView):
    """POST /api/businesses/<business_pk>/members/add/"""
    permission_classes = [permissions.IsAuthenticated, IsBusinessOwnerOrAdmin]

    def post(self, request, business_pk):
        business = get_object_or_404(Business, pk=business_pk)
        serializer = AddMemberSerializer(
            data=request.data, context={"business": business}
        )
        serializer.is_valid(raise_exception=True)
        member = serializer.save()
        return Response(
            BusinessMemberSerializer(member).data,
            status=status.HTTP_201_CREATED,
        )


class BusinessMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/businesses/<business_pk>/members/<pk>/
    Update role or remove a member.
    """
    serializer_class = BusinessMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessOwnerOrAdmin]

    def get_queryset(self):
        return BusinessMember.objects.filter(business_id=self.kwargs["business_pk"])