from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Category
        fields = ["id", "name", "description", "product_count",
                  "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at", "product_count"]


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

    def validate(self, attrs):
        """Ensure category belongs to the same business as the product."""
        business = self.context.get("business")
        category = attrs.get("category")
        if category and business and category.business_id != business.id:
            raise serializers.ValidationError(
                {"category": "Category does not belong to this business."}
            )
        return attrs


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)

    class Meta:
        model = Product
        fields = ["id", "name", "sku", "price", "cost",
                  "category", "category_name", "is_active"]