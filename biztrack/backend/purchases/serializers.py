from rest_framework import serializers

from .models import Purchase, PurchaseItem


class PurchaseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseItem
        fields = [
            "id", "product", "product_name", "product_sku",
            "quantity", "unit_cost", "subtotal",
        ]
        read_only_fields = fields


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True, read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True, default=None)
    voided_by_email = serializers.EmailField(source="voided_by.email", read_only=True, default=None)
    supplier_id = serializers.IntegerField(source="supplier.id", read_only=True, default=None)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Purchase
        fields = [
            "id", "supplier", "supplier_id", "supplier_name", "supplier_phone",
            "total", "is_paid", "paid_at", "status", "note",
            "created_by", "created_by_email", "created_at",
            "voided_at", "voided_by", "voided_by_email", "void_reason",
            "items", "item_count",
        ]
        read_only_fields = fields

    def get_item_count(self, obj):
        return obj.items.count()


class CreatePurchaseItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)


class CreatePurchaseSerializer(serializers.Serializer):
    items = CreatePurchaseItemSerializer(many=True, allow_empty=False)
    supplier_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    supplier_name = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    supplier_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")
    is_paid = serializers.BooleanField(required=False, default=False)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")

    def validate_items(self, value):
        product_ids = [item["product_id"] for item in value]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                "Each product may only appear once. Combine quantities instead."
            )
        return value


class VoidPurchaseSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")