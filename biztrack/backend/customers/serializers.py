from rest_framework import serializers

from .models import Customer, Supplier


class CustomerSerializer(serializers.ModelSerializer):
    """
    Full customer serializer for create/update/detail.
    Computed stats (total_spent, sale_count, last_purchase_at) are added
    by the view via queryset annotation.
    """
    total_spent = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True, required=False
    )
    sale_count = serializers.IntegerField(read_only=True, required=False)
    last_purchase_at = serializers.DateTimeField(read_only=True, required=False)

    class Meta:
        model = Customer
        fields = [
            "id", "name", "phone", "email", "address", "notes",
            "total_spent", "sale_count", "last_purchase_at",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "total_spent", "sale_count", "last_purchase_at",
            "created_at", "updated_at",
        ]

    def validate_phone(self, value):
        if not value:
            return value
        business = self.context.get("business")
        if business is None:
            return value
        qs = Customer.objects.filter(business=business, phone=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A customer with this phone already exists in this business."
            )
        return value


class CustomerListSerializer(serializers.ModelSerializer):
    """Lightweight customer serializer for list views with stats."""
    total_spent = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True, required=False
    )
    sale_count = serializers.IntegerField(read_only=True, required=False)
    last_purchase_at = serializers.DateTimeField(read_only=True, required=False)

    class Meta:
        model = Customer
        fields = [
            "id", "name", "phone", "email",
            "total_spent", "sale_count", "last_purchase_at",
            "created_at",
        ]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id", "name", "phone", "email", "address", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_phone(self, value):
        if not value:
            return value
        business = self.context.get("business")
        if business is None:
            return value
        qs = Supplier.objects.filter(business=business, phone=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A supplier with this phone already exists in this business."
            )
        return value