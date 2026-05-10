// Mock data for the Book My Event prototype.
// Replace with real DB calls (e.g. Prisma + Postgres) when wiring the backend.

import {
  eventCategoryGroups,
  slugifyCategoryName,
} from "@/lib/event-categories";

export type Category = {
  slug: string;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
};

/** One entry per leaf category (aligned with `seed_event_categories` on the backend). */
export const categories: Category[] = eventCategoryGroups.flatMap((group) =>
  group.items.map((item) => ({
    slug: slugifyCategoryName(item.name),
    name: item.name,
    description: item.description,
    icon: group.icon,
  }))
);

/** Top-level groups for marketing / filters (fewer chips than full `categories`). */
export const categoryGroupSummaries = eventCategoryGroups.map((g) => ({
  id: g.id,
  name: g.name,
  description: g.description,
  icon: g.icon,
  heroImage: g.heroImage,
}));

export type Service = {
  id: string;
  name: string;
  category: string;
  organizer: string;
  organizerId: string;
  city: string;
  rating: number;
  reviews: number;
  priceFrom: number;
  /** Upper bound when organizer publishes a price band (same as priceFrom if single). */
  priceTo?: number;
  unit: "per event" | "per guest" | "per head" | "per hour";
  image: string;
  tags: string[];
  description: string;
  includedAmenities?: string[];
  /** Occasions this listing targets (e.g. Wedding, Nikkah). */
  eventTypes?: string[];
};

export const services: Service[] = [
  {
    id: "svc-1",
    name: "Heritage Wedding Catering",
    category: "catering",
    organizer: "Maison Auberge",
    organizerId: "org-1",
    city: "Lahore",
    rating: 4.9,
    reviews: 187,
    priceFrom: 2500,
    unit: "per guest",
    image:
      "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80",
    tags: ["Wedding", "Plated", "Halal"],
    description:
      "A four-course heritage menu featuring slow-cooked specialties and modern plating presented by a brigade of senior chefs.",
  },
  {
    id: "svc-2",
    name: "Garden Floral Tablescape",
    category: "decor",
    organizer: "Petal & Vine Studio",
    organizerId: "org-2",
    city: "Islamabad",
    rating: 4.8,
    reviews: 96,
    priceFrom: 180000,
    unit: "per event",
    image:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80",
    tags: ["Florals", "Outdoor", "Romantic"],
    description:
      "Lush, garden-inspired tablescapes with seasonal flowers, brass candelabras, and hand-pressed linens.",
  },
  {
    id: "svc-3",
    name: "Cinematic Wedding Film",
    category: "photography",
    organizer: "Lumen Studios",
    organizerId: "org-3",
    city: "Karachi",
    rating: 4.95,
    reviews: 212,
    priceFrom: 350000,
    unit: "per event",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    tags: ["Film", "Photo", "Drone"],
    description:
      "A two-camera cinematic team capturing your story with editorial photography and a feature-length film.",
  },
  {
    id: "svc-4",
    name: "Live Acoustic Trio",
    category: "music",
    organizer: "Velvet Note Co.",
    organizerId: "org-4",
    city: "Lahore",
    rating: 4.7,
    reviews: 64,
    priceFrom: 120000,
    unit: "per event",
    image:
      "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80",
    tags: ["Live", "Acoustic", "Romantic"],
    description:
      "An intimate trio specializing in soul, jazz standards and contemporary acoustic covers for ceremonies and dinners.",
  },
  {
    id: "svc-5",
    name: "The Orangerie Ballroom",
    category: "venues",
    organizer: "Orangerie Estate",
    organizerId: "org-5",
    city: "Islamabad",
    rating: 4.85,
    reviews: 143,
    priceFrom: 850000,
    unit: "per event",
    image:
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80",
    tags: ["Ballroom", "350 guests", "Garden"],
    description:
      "A glass-roofed ballroom set inside a private estate with manicured gardens and a sweeping marble staircase.",
  },
  {
    id: "svc-6",
    name: "Full-Service Wedding Planning",
    category: "planning",
    organizer: "Atelier Évent",
    organizerId: "org-6",
    city: "Karachi",
    rating: 4.92,
    reviews: 98,
    priceFrom: 600000,
    unit: "per event",
    image:
      "https://images.unsplash.com/photo-1530023367847-a683933f4172?auto=format&fit=crop&w=1200&q=80",
    tags: ["Concierge", "Design", "On-site"],
    description:
      "From concept and design to vendor coordination and on-site direction — your day, perfectly orchestrated.",
  },
  {
    id: "svc-7",
    name: "Corporate Gala Catering",
    category: "catering",
    organizer: "Maison Auberge",
    organizerId: "org-1",
    city: "Lahore",
    rating: 4.8,
    reviews: 74,
    priceFrom: 3200,
    unit: "per guest",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
    tags: ["Corporate", "Buffet", "Premium"],
    description:
      "A premium gala buffet with carving stations, seafood bar and curated dessert wall — designed for 200+ guests.",
  },
  {
    id: "svc-8",
    name: "Boho Tent & Lighting",
    category: "decor",
    organizer: "Petal & Vine Studio",
    organizerId: "org-2",
    city: "Lahore",
    rating: 4.6,
    reviews: 51,
    priceFrom: 240000,
    unit: "per event",
    image:
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80",
    tags: ["Tent", "Lighting", "Outdoor"],
    description:
      "Romantic stretch-tent installations with hanging Edison festoons, sheer drapery and clustered florals.",
  },
];

export type Venue = {
  id: string;
  name: string;
  city: string;
  capacity: number;
  priceFrom: number;
  image: string;
  features: string[];
};

export const venues: Venue[] = [
  {
    id: "ven-1",
    name: "The Orangerie Ballroom",
    city: "Islamabad",
    capacity: 350,
    priceFrom: 850000,
    image:
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80",
    features: ["Garden", "Glass Roof", "Valet Parking"],
  },
  {
    id: "ven-2",
    name: "Belvedere Rooftop",
    city: "Karachi",
    capacity: 180,
    priceFrom: 520000,
    image:
      "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80",
    features: ["Skyline View", "Bar", "DJ Booth"],
  },
  {
    id: "ven-3",
    name: "Mahal Heritage Lawn",
    city: "Lahore",
    capacity: 600,
    priceFrom: 950000,
    image:
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80",
    features: ["Heritage", "Lawn", "Mughal Architecture"],
  },
  {
    id: "ven-4",
    name: "Marina Pavilion",
    city: "Karachi",
    capacity: 250,
    priceFrom: 680000,
    image:
      "https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?auto=format&fit=crop&w=1200&q=80",
    features: ["Waterfront", "Pavilion", "Sunset View"],
  },
];

export type TeamMember = {
  name: string;
  role: string;
  image: string;
};

export const team: TeamMember[] = [
  {
    name: "Amelia Hart",
    role: "Lead Event Director",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Hassan Raza",
    role: "Executive Chef",
    image:
      "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Sofia Almeida",
    role: "Floral Designer",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Daniyal Khan",
    role: "Production Manager",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  },
];

export type Testimonial = {
  name: string;
  event: string;
  rating: number;
  quote: string;
  image: string;
};

export const testimonials: Testimonial[] = [
  {
    name: "Ayesha & Bilal",
    event: "Wedding • Lahore",
    rating: 5,
    quote:
      "Book My Event made the impossible feel effortless. From the menu to the florals to our cinematic film — every vendor was a dream.",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Maria Junaid",
    event: "Corporate Gala • Karachi",
    rating: 5,
    quote:
      "The package builder and live budget tracker saved us countless hours. Our finance team was thrilled with the transparency.",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Hamza & Iqra",
    event: "Engagement • Islamabad",
    rating: 5,
    quote:
      "Real-time chat with our organizer made every decision feel collaborative. We felt heard and looked after at every step.",
    image:
      "https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=400&q=80",
  },
];

export type EventShowcase = {
  id: string;
  title: string;
  type: string;
  date: string;
  location: string;
  image: string;
};

export const eventShowcase: EventShowcase[] = [
  {
    id: "ev-1",
    title: "A Garden Wedding in Bloom",
    type: "Wedding",
    date: "April 14",
    location: "Orangerie Estate, Islamabad",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "ev-2",
    title: "Annual Founders' Gala",
    type: "Corporate",
    date: "May 02",
    location: "Belvedere Rooftop, Karachi",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "ev-3",
    title: "An Heirloom Mehndi Night",
    type: "Mehndi",
    date: "May 19",
    location: "Mahal Heritage Lawn, Lahore",
    image:
      "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80",
  },
];

export const stats = [
  { label: "Happy Clients", value: "1,800+" },
  { label: "Verified Organizers", value: "320+" },
  { label: "Cities Covered", value: "12" },
  { label: "Average Rating", value: "4.9/5" },
];

export function formatPKR(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}
