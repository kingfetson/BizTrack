from django.contrib import admin
from .models import Customer, Supplier


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["name", "phone", "email", "business", "created_at"]
    list_filter = ["business"]
    search_fields = ["name", "phone", "email", "business__name"]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["business"]
    list_select_related = ["business"]


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ["name", "phone", "email", "business", "created_at"]
    list_filter = ["business"]
    search_fields = ["name", "phone", "email", "business__name"]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["business"]
    list_select_related = ["business"]