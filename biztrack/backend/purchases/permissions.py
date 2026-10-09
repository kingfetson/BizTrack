from rest_framework import permissions
from rest_framework.exceptions import NotFound


class IsPurchaseReader(permissions.BasePermission):
    """Any member can read purchases. Returns 404 for non-members."""
    message = "You do not have access to this business."

    def has_permission(self, request, view):
        business_pk = view.kwargs.get("business_pk")
        if business_pk is None:
            return True
        if not request.user.memberships.filter(business_id=business_pk).exists():
            raise NotFound("No such business.")
        return True


class IsPurchaseWriter(permissions.BasePermission):
    """Only OWNER/ADMIN/MANAGER can create or void purchases."""
    message = "Only managers or admins can modify purchases."

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