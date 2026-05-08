from rest_framework.permissions import BasePermission


class IsPaymentOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and obj.booking.client_id == request.user.id
