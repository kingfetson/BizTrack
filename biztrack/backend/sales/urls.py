from django.urls import path

from .views import (
    SaleListCreateView,
    SaleDetailView,
    SaleVoidView,
)

urlpatterns = [
    path("sales/", SaleListCreateView.as_view(), name="sale-list-create"),
    path("sales/<int:pk>/", SaleDetailView.as_view(), name="sale-detail"),
    path("sales/<int:pk>/void/", SaleVoidView.as_view(), name="sale-void"),
]