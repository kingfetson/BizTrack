from django.contrib import admin
from .models import Category, Product, StockLevel, StockMovement


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "business", "created_at"]
    list_filter = ["business"]
    search_fields = ["name", "business__name"]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["business"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "sku", "business", "category", "price", "cost", "is_active"]
    list_filter = ["business", "category", "is_active"]
    search_fields = ["name", "sku", "barcode", "business__name"]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["business", "category"]
    list_select_related = ["business", "category"]
    list_per_page = 25
    fieldsets = (
        (None, {"fields": ("business", "name", "category", "is_active")}),
        ("Identification", {"fields": ("sku", "barcode")}),
        ("Pricing", {"fields": ("price", "cost")}),
        ("Details", {"fields": ("description", "image")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(StockLevel)
class StockLevelAdmin(admin.ModelAdmin):
    list_display = ["product", "quantity", "low_stock_threshold", "updated_at"]
    search_fields = ["product__name", "product__sku"]
    autocomplete_fields = ["product"]
    readonly_fields = ["updated_at"]


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ["product", "reason", "quantity_delta", "quantity_after", "created_by", "created_at"]
    list_filter = ["reason", "created_at"]
    search_fields = ["product__name", "product__sku", "note"]
    autocomplete_fields = ["product", "created_by"]
    readonly_fields = ["created_at"]
    date_hierarchy = "created_at"