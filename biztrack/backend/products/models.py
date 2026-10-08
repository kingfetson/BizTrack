from django.core.validators import MinValueValidator
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from businesses.models import Business


class Category(models.Model):
    """
    Product category, scoped to a single business.
    Names are unique per business but can repeat across businesses.
    """
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "name"],
                name="unique_category_name_per_business",
            ),
        ]
        indexes = [
            models.Index(fields=["business", "name"]),
        ]
        verbose_name_plural = "Categories"

    def __str__(self):
        return f"{self.name} ({self.business.name})"


class Product(models.Model):
    """
    A product sold or tracked by a business.
    Scoped to a business; SKU is unique per business when non-empty.
    """
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="products",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        related_name="products",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=200, db_index=True)
    sku = models.CharField(max_length=64, blank=True)
    barcode = models.CharField(max_length=64, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    cost = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
    )
    image = models.ImageField(upload_to="product_images/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "sku"],
                condition=models.Q(sku__gt=""),
                name="unique_sku_per_business_when_present",
            ),
        ]
        indexes = [
            models.Index(fields=["business", "name"]),
            models.Index(fields=["business", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} [{self.business.name}]"

    @property
    def margin(self):
        """Gross margin percentage. 0 if price is 0."""
        if self.price and self.price > 0:
            return round(((self.price - self.cost) / self.price) * 100, 2)
        return 0


class StockLevel(models.Model):
    """
    One-to-one current stock for a product.
    The quantity is a cached value - the movement log is the source of truth.
    Auto-created when a Product is created (see signal below).
    """
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name="stock",
    )
    quantity = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=5)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Stock level"
        verbose_name_plural = "Stock levels"

    def __str__(self):
        return f"{self.product.name}: {self.quantity}"

    @property
    def is_low(self):
        return self.quantity <= self.low_stock_threshold


class StockMovement(models.Model):
    """
    Append-only audit log of every stock change.
    Never update or delete rows - only insert.
    """
    class Reason(models.TextChoices):
        INITIAL = "INITIAL", "Initial stock"
        PURCHASE = "PURCHASE", "Purchase"
        SALE = "SALE", "Sale"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"
        RETURN = "RETURN", "Return"
        TRANSFER = "TRANSFER", "Transfer"
        LOSS = "LOSS", "Loss / damage"

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="movements",
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    quantity_delta = models.IntegerField()  # positive to add, negative to remove
    quantity_after = models.IntegerField()  # snapshot for audit trail
    note = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product", "-created_at"]),
            models.Index(fields=["reason"]),
        ]

    def __str__(self):
        sign = "+" if self.quantity_delta >= 0 else ""
        return f"{self.product.name}: {sign}{self.quantity_delta} ({self.reason})"


# ----------------------------------------------------------------------------
# Signal: auto-create StockLevel whenever a Product is created
# ----------------------------------------------------------------------------
@receiver(post_save, sender=Product)
def ensure_stock_level(sender, instance, created, **kwargs):
    """
    Create a StockLevel row the first time a Product is saved.
    Also writes an INITIAL movement with quantity 0 so the log starts clean.
    """
    if created:
        StockLevel.objects.create(product=instance, quantity=0)
        StockMovement.objects.create(
            product=instance,
            reason=StockMovement.Reason.INITIAL,
            quantity_delta=0,
            quantity_after=0,
            note="Product created",
        )