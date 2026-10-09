from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from businesses.models import Business
from products.models import Product


class Purchase(models.Model):
    """
    A purchase order from a supplier. Immutable once recorded.
    Increases stock via PURCHASE movements. Voiding reverses via LOSS.
    """
    class Status(models.TextChoices):
        COMPLETED = "COMPLETED", "Completed"
        VOIDED = "VOIDED", "Voided"

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="purchases",
    )
    supplier = models.ForeignKey(
        "customers.Supplier",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="purchases",
    )
    # Snapshot of supplier info at time of purchase
    supplier_name = models.CharField(max_length=200, blank=True)
    supplier_phone = models.CharField(max_length=30, blank=True)

    total = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
    )
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED,
    )
    note = models.CharField(max_length=255, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="purchases_created",
    )
    created_at = models.DateTimeField(default=timezone.now)

    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="purchases_voided",
    )
    void_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business", "-created_at"]),
            models.Index(fields=["business", "status"]),
            models.Index(fields=["supplier"]),
        ]

    def __str__(self):
        return f"Purchase #{self.pk} - {self.business.name} - {self.total}"


class PurchaseItem(models.Model):
    """
    A line item in a purchase.
    `unit_cost` is captured at purchase time.
    """
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="purchase_items",
    )
    product_name = models.CharField(max_length=200)
    product_sku = models.CharField(max_length=64, blank=True)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_cost = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    subtotal = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.quantity} x {self.product_name} @ {self.unit_cost}"