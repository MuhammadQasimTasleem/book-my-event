/**
 * Full marketplace taxonomy (groups + leaf categories with imagery).
 * Backend: run `python manage.py seed_event_categories` so DB names match `item.name`.
 */

export type EventCategoryItem = {
  name: string;
  description: string;
  /** Representative image for cards / package builder */
  image: string;
};

export type EventCategoryGroup = {
  id: string;
  name: string;
  description: string;
  /** lucide icon name for fallbacks */
  icon: string;
  heroImage: string;
  items: EventCategoryItem[];
};

/** Match Django `slugify` for ASCII category names */
export function slugifyCategoryName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const img = (path: string) =>
  `https://images.unsplash.com/${path}?auto=format&fit=crop&w=1200&q=80`;

export const eventCategoryGroups: EventCategoryGroup[] = [
  {
    id: "venues",
    name: "Venue Services",
    description: "Halls, marquees, farms, rooftops, and corporate spaces.",
    icon: "Landmark",
    heroImage: img("photo-1519741497674-611481863552"),
    items: [
      { name: "Wedding Halls", description: "Banquet halls and ballroom venues.", image: img("photo-1519741497674-611481863552") },
      { name: "Marquee Services", description: "Outdoor marquee tents and structures.", image: img("photo-1464366400600-7168b8af9bc3") },
      { name: "Farmhouses", description: "Rustic farm and garden estates.", image: img("photo-1520854221256-17451cc331bf") },
      { name: "Outdoor Event Venues", description: "Lawns, gardens, and open-air settings.", image: img("photo-1478146896981-b80fe463b330") },
      { name: "Rooftop Venues", description: "Skyline views and terrace events.", image: img("photo-1497366216548-37526070297c") },
      { name: "Corporate Event Halls", description: "Professional venues for business events.", image: img("photo-1540575467063-178a50c2df87") },
      { name: "Conference Rooms", description: "Meeting and breakout spaces.", image: img("photo-1560439513-74b037a25d84") },
      { name: "Birthday Party Venues", description: "Spaces tailored for birthdays.", image: img("photo-1530103862676-de8c9debad1d") },
    ],
  },
  {
    id: "catering",
    name: "Catering Services",
    description: "Menus from traditional to corporate and sweets.",
    icon: "Utensils",
    heroImage: img("photo-1555244162-803834f70033"),
    items: [
      { name: "Pakistani Catering", description: "Traditional desi menus and live stations.", image: img("photo-1555939594-58d7cb561ad1") },
      { name: "BBQ Catering", description: "Grills, live BBQ, and outdoor cooking.", image: img("photo-1529193591184-b1d58069ecdd") },
      { name: "Buffet Catering", description: "Full buffet spreads and service.", image: img("photo-1574672280600-4accfa3b6b1c") },
      { name: "Hi-Tea Catering", description: "Afternoon tea and light bites.", image: img("photo-1544787219-7f47ccb76574") },
      { name: "Corporate Catering", description: "Business lunches and galas.", image: img("photo-1414235077428-338989a2e8c0") },
      { name: "Dessert & Sweet Services", description: "Mithai, dessert tables, and cakes.", image: img("photo-1551024506-0bccd828d307") },
      { name: "Tea & Refreshment Services", description: "Beverage and refreshment bars.", image: img("photo-1544787219-7f47ccb76574") },
    ],
  },
  {
    id: "photo-media",
    name: "Photography & Media",
    description: "Capture and broadcast every moment.",
    icon: "Camera",
    heroImage: img("photo-1519741497674-611481863552"),
    items: [
      { name: "Wedding Photography", description: "Full-day wedding coverage.", image: img("photo-1606800052052-a08c70f82775") },
      { name: "Cinematography", description: "Cinematic films and storytelling.", image: img("photo-1492691527719-9d1e07e534b4") },
      { name: "Drone Photography", description: "Aerial photo and video.", image: img("photo-1473968512647-3e447244af3f") },
      { name: "Videography", description: "Multi-camera event video.", image: img("photo-1533750516457-a7f992034fec") },
      { name: "Live Streaming", description: "Broadcast to remote guests.", image: img("photo-1598488035139-bdbb2231ce04") },
      { name: "Event Highlight Videos", description: "Short reels and highlight edits.", image: img("photo-1524712245354-2c4f5c6b2b5e") },
      { name: "Photo Booth Services", description: "Instant prints and fun props.", image: img("photo-1527529482837-4698179dc6ce") },
    ],
  },
  {
    id: "decor",
    name: "Decoration Services",
    description: "Stages, florals, themes, and lighting.",
    icon: "Flower2",
    heroImage: img("photo-1519225421980-715cb0215aed"),
    items: [
      { name: "Wedding Decoration", description: "Full wedding stage and aisle design.", image: img("photo-1465495976277-4387d4b0b4c6") },
      { name: "Mehndi Decoration", description: "Colorful mehndi and mayun setups.", image: img("photo-1522673607200-1645061cd190") },
      { name: "Floral Decoration", description: "Fresh and premium florals.", image: img("photo-1455659817273-f9680777a8f5") },
      { name: "Stage Decoration", description: "Custom stages and backdrops.", image: img("photo-1478147427282-58a87a120781") },
      { name: "Theme-Based Decoration", description: "Concept-driven décor packages.", image: img("photo-1505236858219-8359eb29e329") },
      { name: "Birthday Decoration", description: "Balloons, banners, and party themes.", image: img("photo-1530103862676-de8c9debad1d") },
      { name: "Corporate Decoration", description: "Branded and professional setups.", image: img("photo-1540575467063-178a50c2df87") },
      { name: "Lighting Decoration", description: "Uplighting, fairy lights, and FX.", image: img("photo-1513151233558-d860c5398176") },
    ],
  },
  {
    id: "entertainment",
    name: "Entertainment Services",
    description: "Sound, music, and live performances.",
    icon: "Music",
    heroImage: img("photo-1470229722913-7c0e2dbbafd3"),
    items: [
      { name: "DJ Services", description: "DJ and party mixing.", image: img("photo-1571330735066-03a6b4a6610d") },
      { name: "Sound Systems", description: "PA, speakers, and technicians.", image: img("photo-1598488035139-bdbb2231ce04") },
      { name: "Qawwali Nights", description: "Traditional qawwali ensembles.", image: img("photo-1514320291840-2e0a9bf2a9ae") },
      { name: "Dhol Services", description: "Dhol players and baraat energy.", image: img("photo-1511671782779-c97d3d27a1d4") },
      { name: "Live Bands", description: "Bands for receptions and parties.", image: img("photo-1501612780327-45045538702b") },
      { name: "Singers", description: "Vocalists for events.", image: img("photo-1493225457124-a3eb161ffa5f") },
      { name: "Dance Floor Setup", description: "Floors, stages, and dance lighting.", image: img("photo-1545128485-c400e7702796") },
      { name: "Fireworks Entry", description: "Sparklers and coordinated entries.", image: img("photo-1462331940025-496dfbfc7564") },
    ],
  },
  {
    id: "beauty",
    name: "Beauty & Grooming",
    description: "Bridal, groom, and styling teams.",
    icon: "Sparkles",
    heroImage: img("photo-1522335789203-aabd1fc54bc9"),
    items: [
      { name: "Bridal Makeup", description: "Bridal makeup and trials.", image: img("photo-1487412947147-5cebf100ffc2") },
      { name: "Groom Makeup", description: "Groom styling and grooming.", image: img("photo-1507003211169-0a1dd7228f2d") },
      { name: "Mehndi Artists", description: "Professional henna artists.", image: img("photo-1522335789203-aabd1fc54bc9") },
      { name: "Hair Styling", description: "Hair for events and shoots.", image: img("photo-1560066984-138dadb4c035") },
      { name: "Salon Packages", description: "Pre-event salon bundles.", image: img("photo-1562322140-8baeececf3df") },
    ],
  },
  {
    id: "transport",
    name: "Transportation Services",
    description: "Cars, buses, and chauffeurs.",
    icon: "Car",
    heroImage: img("photo-1449965408869-eaa3f722e40d"),
    items: [
      { name: "Luxury Cars", description: "Premium vehicle fleet.", image: img("photo-1563720223185-11003d516935") },
      { name: "Bridal Car Rental", description: "Decorated bridal transport.", image: img("photo-1519641471654-76ce0107ad1b") },
      { name: "Guest Transport", description: "Shuttle and guest logistics.", image: img("photo-1544620347-c4fd4a3d5957") },
      { name: "Bus Rental", description: "Coaches for large groups.", image: img("photo-1570125909232-eb263c188f7e") },
      { name: "Chauffeur Services", description: "Professional drivers.", image: img("photo-1449965408869-eaa3f722e40d") },
    ],
  },
  {
    id: "fashion",
    name: "Fashion & Clothing",
    description: "Bridal wear, formal, and accessories.",
    icon: "Shirt",
    heroImage: img("photo-1595777457583-95e059d581b8"),
    items: [
      { name: "Bridal Dresses", description: "Bridal couture and rentals.", image: img("photo-1515372039744-b8f02a3ae446") },
      { name: "Groom Sherwani", description: "Sherwani and formal groom wear.", image: img("photo-1507679799987-c73779587ccf") },
      { name: "Designer Wear", description: "Designer outfits for events.", image: img("photo-1490481651871-ab68de25d43d") },
      { name: "Jewelry Rental", description: "Statement and bridal jewelry.", image: img("photo-1515562141207-7a88fb7ce338") },
    ],
  },
  {
    id: "birthday-kids",
    name: "Birthday & Kids Event Services",
    description: "Fun add-ons for children’s celebrations.",
    icon: "Cake",
    heroImage: img("photo-1530103862676-de8c9debad1d"),
    items: [
      { name: "Cartoon Characters", description: "Mascots and character visits.", image: img("photo-1503454537195-1dcabb73ffb9") },
      { name: "Kids Play Area", description: "Soft play and activity zones.", image: img("photo-1566454419290-57a64afe00c6") },
      { name: "Birthday Cakes", description: "Custom cakes and dessert bars.", image: img("photo-1464349095431-e9a21285b5f3") },
      { name: "Magic Shows", description: "Kids’ entertainers and magic.", image: img("photo-1533174072545-7a4b6ad7a6c3") },
      { name: "Balloon Decoration", description: "Arches, garlands, and themes.", image: img("photo-1527529482837-4698179dc6ce") },
    ],
  },
  {
    id: "corporate",
    name: "Corporate Event Services",
    description: "Conferences, AV, and branding.",
    icon: "Building2",
    heroImage: img("photo-1540575467063-178a50c2df87"),
    items: [
      { name: "Conference Setup", description: "Seating, staging, and flow.", image: img("photo-1560439513-74b037a25d84") },
      { name: "LED Screens", description: "Large-format LED walls.", image: img("photo-1598488035139-bdbb2231ce04") },
      { name: "Projectors", description: "Projection and presentation AV.", image: img("photo-1579154204601-01588f351e67") },
      { name: "Corporate Branding", description: "Signage, booths, and graphics.", image: img("photo-1556761175-b413da4baf72") },
      { name: "Event Anchors", description: "Hosts and MCs.", image: img("photo-1475721027785-f74eccf877e2") },
      { name: "Seminar Management", description: "End-to-end seminar logistics.", image: img("photo-1505373877841-8d25f7d46678") },
    ],
  },
  {
    id: "religious",
    name: "Religious Event Services",
    description: "Nikkah, milad, and Islamic gatherings.",
    icon: "Moon",
    heroImage: img("photo-1464699908534-9e6c6dd3f8c5"),
    items: [
      { name: "Nikkah Setup", description: "Simple and elegant nikkah décor.", image: img("photo-1519225421980-715cb0215aed") },
      { name: "Quran Khawani Arrangement", description: "Seating and floral for khawani.", image: img("photo-1464699908534-9e6c6dd3f8c5") },
      { name: "Milad Decoration", description: "Milad and naat gatherings.", image: img("photo-1507003211169-0a1dd7228f2d") },
      { name: "Islamic Event Catering", description: "Halal menus for religious events.", image: img("photo-1555939594-58d7cb561ad1") },
    ],
  },
];

/** Flat list with group meta for browsing */
export function getAllLeafCategories(): { group: EventCategoryGroup; item: EventCategoryItem; slug: string }[] {
  return eventCategoryGroups.flatMap((group) =>
    group.items.map((item) => ({
      group,
      item,
      slug: slugifyCategoryName(item.name),
    }))
  );
}
