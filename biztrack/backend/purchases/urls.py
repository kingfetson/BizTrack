from django.urls import path

from .views import (
    PurchaseListCreateView,
    PurchaseDetailView,
    PurchaseVoidView,
)

urlpatterns = [
    path("purchases/", PurchaseListCreateView.as_view(), name="purchase-list-create"),
    path("purchases/<int:pk>/", PurchaseDetailView.as_view(), name="purchase-detail"),
    path("purchases/<int:pk>/void/", PurchaseVoidView.as_view(), name="purchase-void"),
]