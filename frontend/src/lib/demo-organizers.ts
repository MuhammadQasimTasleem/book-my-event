import type { OrganizerProfileApi } from "@/lib/api/types";

/**
 * Illustrative profiles for the organizers page “Spotlight examples” grid.
 * Not real accounts — links go to Contact with a demo query param.
 */
export const DEMO_ORGANIZERS: OrganizerProfileApi[] = [
  {
    id: -1,
    user: -1,
    company_name: "Noor & Co. Events — Lahore",
    display_name: "Amina Noor",
    contact_email: "hello@example-events.demo",
    description:
      "Full-service weddings and mehndi with in-house florals, stage design, and curated catering partners across Punjab.",
    approval_status: "approved",
    approval_notes: "",
    approved_by: null,
    approved_at: null,
    average_rating: 4.9,
    services_count: 12,
    service_preview: [
      "Premium wedding catering",
      "Mehndi stage & lighting",
      "Guest coordination",
    ],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: -2,
    user: -2,
    company_name: "Skyline Corporate Galas",
    display_name: "Bilal Rahman",
    contact_email: "events@example-corp.demo",
    description:
      "Corporate launches, annual dinners, and hybrid conferences with AV, branding, and executive hospitality.",
    approval_status: "approved",
    approval_notes: "",
    approved_by: null,
    approved_at: null,
    average_rating: 4.8,
    services_count: 9,
    service_preview: [
      "Conference AV & streaming",
      "Branded décor",
      "VIP hospitality",
    ],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: -3,
    user: -3,
    company_name: "Velvet Table Catering",
    display_name: "Sara Khan",
    contact_email: "bookings@example-catering.demo",
    description:
      "Chef-led menus from intimate dinners to 500-guest buffets — Pakistani classics, fusion, and dietary-specific menus.",
    approval_status: "approved",
    approval_notes: "",
    approved_by: null,
    approved_at: null,
    average_rating: 4.95,
    services_count: 7,
    service_preview: [
      "Live cooking stations",
      "Wedding menus",
      "Corporate lunch programs",
    ],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];
