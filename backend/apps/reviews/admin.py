from django.contrib import admin

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("reviewer", "reviewee", "rating", "is_visible")
    list_filter = ("is_visible", "rating")
    search_fields = ("reviewer__email", "reviewee__email")
