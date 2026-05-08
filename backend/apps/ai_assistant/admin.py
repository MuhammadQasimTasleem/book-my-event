from django.contrib import admin

from .models import AssistantLog


@admin.register(AssistantLog)
class AssistantLogAdmin(admin.ModelAdmin):
    list_display = ("id", "user_id", "created_at")
