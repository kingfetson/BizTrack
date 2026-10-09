from django.db import models

from businesses.models import Business


class Customer(models.Model):
    """
    A customer of a business.
    Phone is unique per business when non-empty.
    Deleting a customer does NOT delete their sales - the sale keeps a
    snapshot of the name and phone.
    """
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="customers",
    )
    name = models.CharField(max_length=200, db_index=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "phone"],
                condition=models.Q(phone__gt=""),
                name="unique_customer_phone_per_business_when_present",
            ),
        ]
        indexes = [
            models.Index(fields=["business", "name"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.business.name})"


class Supplier(models.Model):
    """
    A supplier that a business buys stock from.
    Will be linked to purchases in a later stage.
    """
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="suppliers",
    )
    name = models.CharField(max_length=200, db_index=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "phone"],
                condition=models.Q(phone__gt=""),
                name="unique_supplier_phone_per_business_when_present",
            ),
        ]
        indexes = [
            models.Index(fields=["business", "name"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.business.name})"