from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from products.models import Product
from products.services import adjust_stock

from .models import Purchase, PurchaseItem


class PurchaseError(Exception):
    """Raised when a purchase cannot be recorded or voided."""


@transaction.atomic
def record_purchase(
    business,
    items_data,
    user=None,
    supplier=None,
    supplier_name="",
    supplier_phone="",
    is_paid=False,
    note="",
):
    """
    Atomically create a Purchase, its PurchaseItems, and stock movements.

    items_data: list of dicts like:
        [{"product_id": 1, "quantity": 20, "unit_cost": "40.00"}, ...]

    supplier: optional Supplier instance. Its name/phone snapshot into the
    purchase unless explicitly overridden.

    Increases stock via adjust_stock(reason="PURCHASE").
    """
    if not items_data:
        raise PurchaseError("A purchase must have at least one item.")

    if supplier is not None:
        if not supplier_name:
            supplier_name = supplier.name
        if not supplier_phone:
            supplier_phone = supplier.phone

    purchase = Purchase.objects.create(
        business=business,
        supplier=supplier,
        supplier_name=supplier_name,
        supplier_phone=supplier_phone,
        is_paid=is_paid,
        paid_at=timezone.now() if is_paid else None,
        note=note,
        created_by=user if getattr(user, "is_authenticated", False) else None,
        total=Decimal("0.00"),
    )

    total = Decimal("0.00")
    product_ids = [item["product_id"] for item in items_data]

    products = {
        p.id: p
        for p in Product.objects.filter(
            business=business, id__in=product_ids
        ).select_related("stock")
    }

    for item in items_data:
        product_id = item["product_id"]
        quantity = int(item["quantity"])
        unit_cost = Decimal(str(item["unit_cost"]))

        if quantity <= 0:
            raise PurchaseError("Item quantity must be positive.")

        product = products.get(product_id)
        if product is None:
            raise PurchaseError(f"Product {product_id} not found in this business.")

        subtotal = unit_cost * quantity
        PurchaseItem.objects.create(
            purchase=purchase,
            product=product,
            product_name=product.name,
            product_sku=product.sku,
            quantity=quantity,
            unit_cost=unit_cost,
            subtotal=subtotal,
        )

        try:
            adjust_stock(
                product=product,
                delta=quantity,
                reason="PURCHASE",
                note=f"Purchase #{purchase.pk}",
                user=user,
            )
        except ValueError as exc:
            raise PurchaseError(str(exc)) from exc

        total += subtotal

    purchase.total = total
    purchase.save(update_fields=["total"])
    return purchase


@transaction.atomic
def void_purchase(purchase, user=None, reason=""):
    """
    Reverse a completed purchase: reduce stock back, mark as VOIDED.
    Uses LOSS movements because we're reversing a supply, not returning it.
    Fails if any item's stock would go negative.
    """
    if purchase.status == Purchase.Status.VOIDED:
        raise PurchaseError("Purchase is already voided.")

    # First pass: verify all reversals are possible
    for item in purchase.items.all():
        product = item.product
        available = product.stock.quantity
        if available < item.quantity:
            raise PurchaseError(
                f"Cannot void: stock for {product.name} would go negative "
                f"(have {available}, need to remove {item.quantity})."
            )

    # Second pass: apply the reversals
    for item in purchase.items.all():
        adjust_stock(
            product=item.product,
            delta=-item.quantity,
            reason="LOSS",
            note=f"Void of purchase #{purchase.pk}",
            user=user,
        )

    purchase.status = Purchase.Status.VOIDED
    purchase.voided_at = timezone.now()
    purchase.voided_by = user if getattr(user, "is_authenticated", False) else None
    purchase.void_reason = reason
    purchase.save(update_fields=["status", "voided_at", "voided_by", "void_reason"])
    return purchase