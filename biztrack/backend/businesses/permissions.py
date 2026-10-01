from rest_framework import permissions
from rest_framework.exceptions import NotFound


class IsBusinessMember(permissions.BasePermission):
    """
    Return 404 (NotFound) instead of 403 (Forbidden) if the user is not
    a member of the business. This prevents user enumeration of business IDs.
    """
    message = "You do not have access to this business."

    def has_permission(self, request, view):
        business_pk = view.kwargs.get("business_pk") or view.kwargs.get("pk")
        if business_pk is None:
            return True
        if not request.user.memberships.filter(business_id=business_pk).exists():
            raise NotFound("No such business.")
        return True


class IsBusinessOwnerOrAdmin(permissions.BasePermission):
    """Only OWNER or ADMIN roles can mutate membership or business settings."""
    message = "Only owners or admins can perform this action."

    def has_permission(self, request, view):
        business_pk = view.kwargs.get("business_pk") or view.kwargs.get("pk")
        if business_pk is None:
            return True
        return request.user.memberships.filter(
            business_id=business_pk,
            role__in=["OWNER", "ADMIN"],
        ).exists()