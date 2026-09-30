from django.conf import settings
from django.db import models


class Business(models.Model):
    class BusinessType(models.TextChoices):
        RETAIL = "RETAIL", "Retail"
        WHOLESALE = "WHOLESALE", "Wholesale"
        RESTAURANT = "RESTAURANT", "Restaurant"
        PHARMACY = "PHARMACY", "Pharmacy"
        OTHER = "OTHER", "Other"

    name = models.CharField(max_length=200)
    business_type = models.CharField(
        max_length=20, choices=BusinessType.choices, default=BusinessType.RETAIL
    )
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    currency = models.CharField(max_length=10, default="KES")
    logo = models.ImageField(upload_to="business_logos/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Businesses"

    def __str__(self):
        return self.name


class BusinessMember(models.Model):
    """
    Join table: a User can belong to MANY businesses.
    Each membership has a role that controls what they can do.
    """
    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        ADMIN = "ADMIN", "Admin"
        MANAGER = "MANAGER", "Manager"
        CASHIER = "CASHIER", "Cashier"
        STAFF = "STAFF", "Staff"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="members",
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STAFF)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "business"], name="unique_user_business_membership"
            ),
        ]
        indexes = [
            models.Index(fields=["business", "role"]),
            models.Index(fields=["user"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} @ {self.business.name} ({self.role})"
