from rest_framework.permissions import BasePermission


class IsPackageOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.role == request.user.Role.ADMIN:
            return True
        return obj.client_id == request.user.id
