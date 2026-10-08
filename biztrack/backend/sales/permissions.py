from rest_framework import permissions
from rest_framework.exceptions import NotFound


class IsBusinessMember(permissions.BasePermission):
    """Returns 404 for non-members to prevent ID enumeration."""
    message = "You do not have access to this business."

    def has_permission(self, request, view):
        business_pk = view.kwargs.get("business_pk")
        if business_pk is None:
            return True
        if not request.user.memberships.filter(business_id=business_pk).exists():
            raise NotFound("No such business.")
        return True


class IsSaleVoider(permissions.BasePermission):
    """Only OWNER/ADMIN/MANAGER can void a sale."""
    message = "Only managers or admins can void a sale."

    def has_permission(self, request, view):
        business_pk = view.kwargs.get("business_pk")
        if business_pk is None:
            return True
        return request.user.memberships.filter(
            business_id=business_pk,
            role__in=["OWNER", "ADMIN", "MANAGER"],
        ).exists()