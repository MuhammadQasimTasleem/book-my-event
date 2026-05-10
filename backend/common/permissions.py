from django.contrib.auth import get_user_model
from rest_framework.permissions import BasePermission

from apps.organizers.models import OrganizerProfile

User = get_user_model()


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.ADMIN


class IsOrganizer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.ORGANIZER


class IsClient(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.CLIENT


class IsApprovedOrganizer(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != User.Role.ORGANIZER:
            return False
        profile = getattr(request.user, "organizer_profile", None)
        return bool(profile and profile.is_approved)


class CanOrganizerManageOwnServices(BasePermission):
    """Organizer may create/edit own services while profile exists (draft through approved)."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != User.Role.ORGANIZER:
            return False
        profile = getattr(request.user, "organizer_profile", None)
        if not profile:
            return False
        return profile.approval_status in (
            OrganizerProfile.Status.DRAFT,
            OrganizerProfile.Status.PENDING,
            OrganizerProfile.Status.APPROVED,
            OrganizerProfile.Status.REJECTED,
        )
