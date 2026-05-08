from rest_framework.permissions import BasePermission


class IsReviewOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and obj.reviewer_id == request.user.id
