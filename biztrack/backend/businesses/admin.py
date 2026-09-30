from django.contrib import admin
from .models import Business, BusinessMember


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ["name", "business_type", "currency", "phone", "created_at"]
    list_filter = ["business_type", "currency"]
    search_fields = ["name", "phone", "email"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(BusinessMember)
class BusinessMemberAdmin(admin.ModelAdmin):
    list_display = ["user", "business", "role", "created_at"]
    list_filter = ["role"]
    search_fields = ["user__email", "business__name"]
    readonly_fields = ["created_at"]
    autocomplete_fields = ["user", "business"]
