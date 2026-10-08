from rest_framework import serializers

from .models import Sale, SaleItem


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = [
            "id", "product", "product_name", "product_sku",
            "quantity", "unit_price", "subtotal",
        ]
        read_only_fields = fields


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True, default=None)
    voided_by_email = serializers.EmailField(source="voided_by.email", read_only=True, default=None)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            "id", "customer_name", "customer_phone",
            "total", "payment_method", "status", "note",
            "created_by", "created_by_email", "created_at",
            "voided_at", "voided_by", "voided_by_email", "void_reason",
            "items", "item_count",
        ]
        read_only_fields = fields

    def get_item_count(self, obj):
        return obj.items.count()


class CreateSaleItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)


class CreateSaleSerializer(serializers.Serializer):
    items = CreateSaleItemSerializer(many=True, allow_empty=False)
    payment_method = serializers.ChoiceField(
        choices=Sale.PaymentMethod.choices,
        default=Sale.PaymentMethod.CASH,
    )
    customer_name = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    customer_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")

    def validate_items(self, value):
        # Reject duplicate products - each product should appear once
        product_ids = [item["product_id"] for item in value]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                "Each product may only appear once. Combine quantities instead."
            )
        return value


class VoidSaleSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")