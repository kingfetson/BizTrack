from rest_framework import serializers

from .models import Category, Product, StockLevel, StockMovement


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Category
        fields = ["id", "name", "description", "product_count",
                  "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at", "product_count"]

    def validate_name(self, value):
        business = self.context.get("business")
        if business is None:
            return value
        qs = Category.objects.filter(business=business, name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A category with this name already exists in this business."
            )
        return value


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    margin = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "sku", "barcode", "description",
            "price", "cost", "margin",
            "category", "category_name",
            "image", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "margin", "category_name"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def validate_cost(self, value):
        if value < 0:
            raise serializers.ValidationError("Cost cannot be negative.")
        return value

    def validate_sku(self, value):
        if not value:
            return value
        business = self.context.get("business")
        if business is None:
            return value
        qs = Product.objects.filter(business=business, sku__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A product with this SKU already exists in this business."
            )
        return value

    def validate(self, attrs):
        business = self.context.get("business")
        category = attrs.get("category")
        if category and business and category.business_id != business.id:
            raise serializers.ValidationError(
                {"category": "Category does not belong to this business."}
            )
        return attrs


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)

    class Meta:
        model = Product
        fields = ["id", "name", "sku", "price", "cost",
                  "category", "category_name", "is_active"]


class StockLevelSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    is_low = serializers.BooleanField(read_only=True)

    class Meta:
        model = StockLevel
        fields = [
            "product", "product_name", "product_sku",
            "quantity", "low_stock_threshold", "is_low",
            "updated_at",
        ]
        read_only_fields = ["quantity", "updated_at", "is_low", "product_name", "product_sku"]


class StockMovementSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True, default=None)

    class Meta:
        model = StockMovement
        fields = [
            "id", "product", "reason", "quantity_delta", "quantity_after",
            "note", "created_by", "created_by_email", "created_at",
        ]
        read_only_fields = fields


class AdjustStockSerializer(serializers.Serializer):
    delta = serializers.IntegerField()
    reason = serializers.ChoiceField(choices=StockMovement.Reason.choices)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")

    def validate_delta(self, value):
        if value == 0:
            raise serializers.ValidationError("Change amount cannot be zero.")
        return value

    def validate(self, attrs):
        if attrs["reason"] == StockMovement.Reason.INITIAL:
            raise serializers.ValidationError(
                {"reason": "Use a different reason for manual adjustments."}
            )
        return attrs