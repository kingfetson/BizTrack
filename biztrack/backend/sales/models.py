from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from businesses.models import Business
from products.models import Product


class Sale(models.Model):
    """
    A completed sale transaction. Immutable once created.
    To undo a sale, use void_sale() which reverses stock movements
    and marks the sale as VOIDED - never delete rows.
    """
    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        MPESA = "MPESA", "M-Pesa"
        CARD = "CARD", "Card"
        BANK = "BANK", "Bank transfer"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        COMPLETED = "COMPLETED", "Completed"
        VOIDED = "VOIDED", "Voided"

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="sales",
    )
    # Optional customer info (we'll build a proper Customer model later)
    customer_name = models.CharField(max_length=200, blank=True)
    customer_phone = models.CharField(max_length=30, blank=True)

    total = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )
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
        related_name="sales_created",
    )
    created_at = models.DateTimeField(default=timezone.now)

    # Voiding metadata
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="sales_voided",
    )
    void_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business", "-created_at"]),
            models.Index(fields=["business", "status"]),
        ]

    def __str__(self):
        return f"Sale #{self.pk} - {self.business.name} - {self.total}"


class SaleItem(models.Model):
    """
    A single line item in a sale.
    `unit_price` is captured at time of sale so future price changes
    don't rewrite history.
    """
    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,  # Never delete a product that has been sold
        related_name="sale_items",
    )
    product_name = models.CharField(max_length=200)  # snapshot
    product_sku = models.CharField(max_length=64, blank=True)  # snapshot
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(
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
        return f"{self.quantity} x {self.product_name} @ {self.unit_price}"

    def save(self, *args, **kwargs):
        # Auto-compute subtotal if not set
        if self.subtotal is None or self.subtotal == 0:
            self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)