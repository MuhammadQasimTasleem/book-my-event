from django.contrib import admin
from django.utils.html import format_html

from .models import OrganizerEventPhoto, OrganizerProfile


@admin.register(OrganizerProfile)
class OrganizerProfileAdmin(admin.ModelAdmin):
    list_display = ("company_name", "user", "approval_status", "approved_at")
    list_filter = ("approval_status",)
    search_fields = ("company_name", "user__email")
    autocomplete_fields = ("user", "approved_by")


@admin.register(OrganizerEventPhoto)
class OrganizerEventPhotoAdmin(admin.ModelAdmin):
    list_display = ("thumb", "id", "user", "caption", "sort_order", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__email", "caption")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at", "thumb_preview")

    @admin.display(description="")
    def thumb(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="56" height="42" style="object-fit:cover;border-radius:4px" alt="" />',
                obj.image.url,
            )
        return "—"

    @admin.display(description="Preview")
    def thumb_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width:320px;max-height:240px;object-fit:contain" alt="" />',
                obj.image.url,
            )
        return "Save the entry to see a preview."

    def get_fieldsets(self, request, obj=None):
        main = (
            None,
            {"fields": ("user", "image", "caption", "sort_order")},
        )
        if obj:
            meta = (
                "Image",
                {"fields": ("thumb_preview",)},
            )
            stamps = (
                "Timestamps",
                {"fields": ("created_at", "updated_at")},
            )
            return (main, meta, stamps)
        return (main,)
