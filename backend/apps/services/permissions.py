from rest_framework.permissions import BasePermission

from common.permissions import IsApprovedOrganizer


class IsServiceOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.role == request.user.Role.ADMIN:
            return True
        return obj.organizer_id == request.user.id


__all__ = ["IsServiceOwner", "IsApprovedOrganizer"]
