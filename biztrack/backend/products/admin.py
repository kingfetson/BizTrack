from django.contrib import admin
from .models import Category, Product


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
        (None, {
            "fields": ("business", "name", "category", "is_active"),
        }),
        ("Identification", {
            "fields": ("sku", "barcode"),
        }),
        ("Pricing", {
            "fields": ("price", "cost"),
        }),
        ("Details", {
            "fields": ("description", "image"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
        }),
    )