from django.db import transaction

from .models import Product, StockLevel, StockMovement


@transaction.atomic
def adjust_stock(
    product: Product,
    delta: int,
    reason: str,
    note: str = "",
    user=None,
) -> StockLevel:
    """
    Change a product's stock by `delta` (positive to add, negative to remove).
    Writes a StockMovement row inside the same transaction.

    This is the ONLY place stock quantity should change.
    Never edit StockLevel.quantity directly.
    """
    if delta == 0:
        raise ValueError("delta must be non-zero")

    if reason not in StockMovement.Reason.values:
        raise ValueError(f"Unknown stock movement reason: {reason}")

    # Lock the row so concurrent adjustments don't race
    level = StockLevel.objects.select_for_update().get(product=product)

    new_quantity = level.quantity + delta

    if new_quantity < 0:
        raise ValueError(
            f"Cannot reduce stock below zero. "
            f"Current: {level.quantity}, requested change: {delta}"
        )

    level.quantity = new_quantity
    level.save(update_fields=["quantity", "updated_at"])

    StockMovement.objects.create(
        product=product,
        reason=reason,
        quantity_delta=delta,
        quantity_after=new_quantity,
        note=note,
        created_by=user if getattr(user, "is_authenticated", False) else None,
    )

    return level