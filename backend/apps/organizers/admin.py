from django.contrib import admin

from .models import OrganizerProfile


@admin.register(OrganizerProfile)
class OrganizerProfileAdmin(admin.ModelAdmin):
    list_display = ("company_name", "user", "approval_status", "approved_at")
    list_filter = ("approval_status",)
    search_fields = ("company_name", "user__email")
