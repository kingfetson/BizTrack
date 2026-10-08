from rest_framework import permissions
from rest_framework.exceptions import NotFound


class IsProductReader(permissions.BasePermission):
    """
    Any member of the business can read products.
    Returns 404 (not 403) for non-members to prevent ID enumeration.
    """
    message = "You do not have access to this business."

    def has_permission(self, request, view):
        business_pk = view.kwargs.get("business_pk")
        if business_pk is None:
            return True
        if not request.user.memberships.filter(business_id=business_pk).exists():
            raise NotFound("No such business.")
        return True


class IsProductWriter(permissions.BasePermission):
    """
    Only MANAGER, ADMIN, or OWNER can create/update/delete products.
    CASHIER and STAFF are read-only.
    """
    message = "You do not have permission to modify products."

    def has_permission(self, request, view):
        # Reads are open to any member
        if request.method in permissions.SAFE_METHODS:
            return True
        business_pk = view.kwargs.get("business_pk")
        if business_pk is None:
            return True
        return request.user.memberships.filter(
            business_id=business_pk,
            role__in=["OWNER", "ADMIN", "MANAGER"],
        ).exists()