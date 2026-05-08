from django.contrib import admin

from .models import EventPackage, PackageItem


@admin.register(EventPackage)
class EventPackageAdmin(admin.ModelAdmin):
    list_display = ("name", "client", "event_type", "tier", "status")
    list_filter = ("status", "tier")
    search_fields = ("name", "client__email")


@admin.register(PackageItem)
class PackageItemAdmin(admin.ModelAdmin):
    list_display = ("package", "service", "category", "tier", "quantity")
