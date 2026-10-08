from django.core.validators import MinValueValidator
from django.db import models

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
    Scoped to a business; SKU is unique per business.
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
            # SKU unique per business when not blank
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