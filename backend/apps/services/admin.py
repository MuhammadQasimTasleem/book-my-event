from django.contrib import admin

from .models import Service, ServiceCategory


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")
    search_fields = ("name",)


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "offering_label",
        "service_type",
        "event_type",
        "organizer",
        "category",
        "tier",
        "price",
        "availability",
    )
    list_filter = ("category", "tier", "availability")
    search_fields = ("title", "service_type", "event_type", "organizer__email")
