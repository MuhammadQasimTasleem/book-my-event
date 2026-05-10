from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.organizers.models import OrganizerEventPhoto

from .models import EmailVerificationToken, PasswordResetToken, User


class OrganizerEventPhotoInline(admin.TabularInline):
    """Portfolio / event images for this account (public organizer gallery)."""

    model = OrganizerEventPhoto
    fk_name = "user"
    extra = 1
    fields = ("image", "caption", "sort_order")
    verbose_name_plural = "Event & portfolio photos"


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("email", "username", "role", "is_verified", "is_active", "created_at")
    list_filter = ("role", "is_active", "is_verified")
    ordering = ("-created_at",)
    search_fields = ("email", "username", "first_name", "last_name")
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Profile", {"fields": ("phone_number", "role", "is_verified")}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ("Profile", {"fields": ("phone_number", "role")}),
    )

    def get_inlines(self, request, obj=None):
        if obj is not None and obj.role == User.Role.ORGANIZER:
            return (OrganizerEventPhotoInline,)
        return ()


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "expires_at", "used")
    search_fields = ("user__email", "token")


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "expires_at", "used")
    search_fields = ("user__email", "token")
