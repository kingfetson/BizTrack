from decimal import Decimal

from django.db import transaction

from products.models import Product
from products.services import adjust_stock

from .models import Sale, SaleItem


class SaleError(Exception):
    """Raised when a sale cannot be recorded (insufficient stock, bad input)."""


@transaction.atomic
def record_sale(
    business,
    items_data,
    user=None,
    payment_method=Sale.PaymentMethod.CASH,
    customer_name="",
    customer_phone="",
    note="",
):
    """
    Atomically create a Sale, its SaleItems, and stock movements.

    items_data: list of dicts like:
        [{"product_id": 1, "quantity": 2, "unit_price": "60.00"}, ...]

    If any item can't be fulfilled (insufficient stock, bad product), the
    whole sale rolls back and a SaleError is raised.

    Returns the created Sale instance.
    """
    if not items_data:
        raise SaleError("A sale must have at least one item.")

    sale = Sale.objects.create(
        business=business,
        payment_method=payment_method,
        customer_name=customer_name,
        customer_phone=customer_phone,
        note=note,
        created_by=user if getattr(user, "is_authenticated", False) else None,
        total=Decimal("0.00"),
    )

    total = Decimal("0.00")
    product_ids = [item["product_id"] for item in items_data]

    # Fetch all products in one query, scoped to this business (multi-tenant safety)
    products = {
        p.id: p
        for p in Product.objects.filter(
            business=business, id__in=product_ids
        ).select_related("stock")
    }

    for item in items_data:
        product_id = item["product_id"]
        quantity = int(item["quantity"])
        unit_price = Decimal(str(item["unit_price"]))

        if quantity <= 0:
            raise SaleError("Item quantity must be positive.")

        product = products.get(product_id)
        if product is None:
            raise SaleError(f"Product {product_id} not found in this business.")

        # Create the line item with a snapshot of name/sku/price
        subtotal = unit_price * quantity
        SaleItem.objects.create(
            sale=sale,
            product=product,
            product_name=product.name,
            product_sku=product.sku,
            quantity=quantity,
            unit_price=unit_price,
            subtotal=subtotal,
        )

        # Decrement stock via Stage 3 service.
        # Raises ValueError if there isn't enough - caught below and re-raised.
        try:
            adjust_stock(
                product=product,
                delta=-quantity,
                reason="SALE",
                note=f"Sale #{sale.pk}",
                user=user,
            )
        except ValueError as exc:
            raise SaleError(str(exc)) from exc

        total += subtotal

    sale.total = total
    sale.save(update_fields=["total"])
    return sale


@transaction.atomic
def void_sale(sale, user=None, reason=""):
    """
    Reverse a completed sale: restore stock, mark the sale as VOIDED.
    Idempotent: calling on an already-voided sale raises SaleError.
    """
    if sale.status == Sale.Status.VOIDED:
        raise SaleError("Sale is already voided.")

    # Restore stock for every item
    for item in sale.items.all():
        adjust_stock(
            product=item.product,
            delta=item.quantity,
            reason="RETURN",
            note=f"Void of sale #{sale.pk}",
            user=user,
        )

    sale.status = Sale.Status.VOIDED
    sale.voided_at = Sale._meta.get_field("created_at").default()  # timezone.now
    sale.voided_by = user if getattr(user, "is_authenticated", False) else None
    sale.void_reason = reason
    sale.save(update_fields=["status", "voided_at", "voided_by", "void_reason"])
    return sale