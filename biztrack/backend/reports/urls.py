from django.urls import path

from .views import (
    SalesSummaryView,
    InventoryReportView,
    PurchasesSummaryView,
    ProfitReportView,
)

urlpatterns = [
    path("reports/sales-summary/", SalesSummaryView.as_view(), name="report-sales-summary"),
    path("reports/inventory/", InventoryReportView.as_view(), name="report-inventory"),
    path("reports/purchases-summary/", PurchasesSummaryView.as_view(), name="report-purchases-summary"),
    path("reports/profit/", ProfitReportView.as_view(), name="report-profit"),
]