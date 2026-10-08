from django.urls import path

from .views import (
    CategoryListCreateView,
    CategoryDetailView,
    ProductListCreateView,
    ProductDetailView,
    StockDetailView,
    StockAdjustView,
    StockMovementListView,
)

urlpatterns = [
    # Categories
    path("categories/", CategoryListCreateView.as_view(), name="category-list-create"),
    path("categories/<int:pk>/", CategoryDetailView.as_view(), name="category-detail"),

    # Products
    path("products/", ProductListCreateView.as_view(), name="product-list-create"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),

    # Stock
    path("products/<int:pk>/stock/", StockDetailView.as_view(), name="stock-detail"),
    path("products/<int:pk>/stock/adjust/", StockAdjustView.as_view(), name="stock-adjust"),
    path("products/<int:pk>/movements/", StockMovementListView.as_view(), name="stock-movements"),
]