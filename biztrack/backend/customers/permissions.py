from rest_framework import permissions
from rest_framework.exceptions import NotFound


class IsCustomerReader(permissions.BasePermission):
    """
    Any member of the business can read customers/suppliers.
    Returns 404 for non-members to prevent ID enumeration.
    """
    message = "You do not have access to this business."

    def has_permission(self, request, view):
        business_pk = view.kwargs.get("business_pk")
        if business_pk is None:
            return True
        if not request.user.memberships.filter(business_id=business_pk).exists():
            raise NotFound("No such business.")
        return True


class IsCustomerWriter(permissions.BasePermission):
    """
    Only MANAGER, ADMIN, or OWNER can create/update/delete customers
    and suppliers. STAFF and CASHIER are read-only.
    """
    message = "You do not have permission to modify customers or suppliers."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        business_pk = view.kwargs.get("business_pk")
        if business_pk is None:
            return True
        return request.user.memberships.filter(
            business_id=business_pk,
            role__in=["OWNER", "ADMIN", "MANAGER"],
        ).exists()