from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Business, BusinessMember

User = get_user_model()


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = [
            "id", "name", "business_type", "phone", "email",
            "address", "currency", "logo", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class BusinessMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = BusinessMember
        fields = ["id", "user", "user_email", "user_full_name",
                  "business", "role", "created_at"]
        read_only_fields = ["id", "business", "created_at"]


class AddMemberSerializer(serializers.Serializer):
    """Add a member by email; creates the membership row."""
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=BusinessMember.Role.choices)

    def validate_email(self, value):
        if not User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("No user with that email.")
        return value

    def create(self, validated_data):
        business = self.context["business"]
        user = User.objects.get(email__iexact=validated_data["email"])
        member, _ = BusinessMember.objects.get_or_create(
            user=user,
            business=business,
            defaults={"role": validated_data["role"]},
        )
        return member