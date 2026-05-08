from rest_framework.permissions import BasePermission


class IsNotificationOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and obj.user_id == request.user.id
