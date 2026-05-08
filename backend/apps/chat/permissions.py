from rest_framework.permissions import BasePermission


class IsMessageParticipant(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            obj.sender_id == request.user.id or obj.receiver_id == request.user.id
        )
