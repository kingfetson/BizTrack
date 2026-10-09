from django.contrib import admin
from .models import Purchase, PurchaseItem


class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 0
    readonly_fields = ["product", "product_name", "product_sku",
                       "quantity", "unit_cost", "subtotal"]
    can_delete = False


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ["id", "business", "supplier_name", "total",
                    "is_paid", "status", "created_at"]
    list_filter = ["business", "status", "is_paid", "created_at"]
    search_fields = ["supplier_name", "supplier_phone", "note"]
    readonly_fields = ["created_at", "paid_at", "voided_at", "voided_by"]
    autocomplete_fields = ["business", "supplier", "created_by"]
    inlines = [PurchaseItemInline]
    date_hierarchy = "created_at"


@admin.register(PurchaseItem)
class PurchaseItemAdmin(admin.ModelAdmin):
    list_display = ["purchase", "product_name", "quantity", "unit_cost", "subtotal"]
    search_fields = ["product_name", "product_sku"]
    autocomplete_fields = ["purchase", "product"]