from django.contrib import admin
from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ["product", "product_name", "product_sku",
                       "quantity", "unit_price", "subtotal"]
    can_delete = False


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ["id", "business", "customer_name", "total",
                    "payment_method", "status", "created_at"]
    list_filter = ["business", "status", "payment_method", "created_at"]
    search_fields = ["customer_name", "customer_phone", "note"]
    readonly_fields = ["created_at", "voided_at", "voided_by"]
    autocomplete_fields = ["business", "created_by"]
    inlines = [SaleItemInline]
    date_hierarchy = "created_at"


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ["sale", "product_name", "quantity", "unit_price", "subtotal"]
    search_fields = ["product_name", "product_sku"]
    autocomplete_fields = ["sale", "product"]