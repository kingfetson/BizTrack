from django.urls import path

from .views import (
    CustomerListCreateView,
    CustomerDetailView,
    SupplierListCreateView,
    SupplierDetailView,
)

urlpatterns = [
    path("customers/", CustomerListCreateView.as_view(), name="customer-list-create"),
    path("customers/<int:pk>/", CustomerDetailView.as_view(), name="customer-detail"),

    path("suppliers/", SupplierListCreateView.as_view(), name="supplier-list-create"),
    path("suppliers/<int:pk>/", SupplierDetailView.as_view(), name="supplier-detail"),
]