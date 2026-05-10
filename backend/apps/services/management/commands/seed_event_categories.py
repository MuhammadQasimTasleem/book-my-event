"""Create ServiceCategory rows for the full event marketplace taxonomy (idempotent)."""

from django.core.management.base import BaseCommand

from apps.services.models import ServiceCategory

# Leaf category names — must match frontend `lib/event-categories.ts` names for slug alignment.
CATEGORY_NAMES = [
    # Venue Services
    "Wedding Halls",
    "Marquee Services",
    "Farmhouses",
    "Outdoor Event Venues",
    "Rooftop Venues",
    "Corporate Event Halls",
    "Conference Rooms",
    "Birthday Party Venues",
    # Catering Services
    "Pakistani Catering",
    "BBQ Catering",
    "Buffet Catering",
    "Hi-Tea Catering",
    "Corporate Catering",
    "Dessert & Sweet Services",
    "Tea & Refreshment Services",
    # Photography & Media
    "Wedding Photography",
    "Cinematography",
    "Drone Photography",
    "Videography",
    "Live Streaming",
    "Event Highlight Videos",
    "Photo Booth Services",
    # Decoration Services
    "Wedding Decoration",
    "Mehndi Decoration",
    "Floral Decoration",
    "Stage Decoration",
    "Theme-Based Decoration",
    "Birthday Decoration",
    "Corporate Decoration",
    "Lighting Decoration",
    # Entertainment Services
    "DJ Services",
    "Sound Systems",
    "Qawwali Nights",
    "Dhol Services",
    "Live Bands",
    "Singers",
    "Dance Floor Setup",
    "Fireworks Entry",
    # Beauty & Grooming
    "Bridal Makeup",
    "Groom Makeup",
    "Mehndi Artists",
    "Hair Styling",
    "Salon Packages",
    # Transportation Services
    "Luxury Cars",
    "Bridal Car Rental",
    "Guest Transport",
    "Bus Rental",
    "Chauffeur Services",
    # Fashion & Clothing
    "Bridal Dresses",
    "Groom Sherwani",
    "Designer Wear",
    "Jewelry Rental",
    # Birthday & Kids Event Services
    "Cartoon Characters",
    "Kids Play Area",
    "Birthday Cakes",
    "Magic Shows",
    "Balloon Decoration",
    # Corporate Event Services
    "Conference Setup",
    "LED Screens",
    "Projectors",
    "Corporate Branding",
    "Event Anchors",
    "Seminar Management",
    # Religious Event Services
    "Nikkah Setup",
    "Quran Khawani Arrangement",
    "Milad Decoration",
    "Islamic Event Catering",
]


class Command(BaseCommand):
    help = "Seed ServiceCategory records for the extended event taxonomy."

    def handle(self, *args, **options):
        created = 0
        for name in CATEGORY_NAMES:
            _, was_created = ServiceCategory.objects.get_or_create(
                name=name,
                defaults={"is_active": True},
            )
            if was_created:
                created += 1
            else:
                ServiceCategory.objects.filter(name=name).update(is_active=True)
        self.stdout.write(
            self.style.SUCCESS(
                f"Event categories: {created} created, {len(CATEGORY_NAMES)} total in list."
            )
        )
