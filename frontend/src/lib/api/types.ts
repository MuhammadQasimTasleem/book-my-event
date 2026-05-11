export type UserRole = "client" | "organizer" | "admin";

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type UserMe = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: UserRole;
  is_verified: boolean;
};

export type ServiceCategoryApi = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

export type ServiceApi = {
  id: number;
  organizer: number;
  organizer_name: string;
  title: string;
  description: string;
  category: number | null;
  category_name: string;
  category_slug: string;
  event_type: string;
  service_type: string;
  /** Distinguishes multiple listings of the same service type (e.g. two Food lines). */
  offering_label?: string;
  tier: string;
  price: string;
  pricing_unit: "per_event" | "per_guest";
  tier_prices: Record<string, string>;
  included_amenities: string[];
  event_types?: string[];
  price_min: string;
  price_max: string;
  location: string;
  rating: string;
  review_count: number;
  availability: boolean;
  images: string[];
  primary_image: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewApi = {
  id: number;
  reviewer: number;
  reviewee: number;
  rating: number;
  comment: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type BookingPriceLine = { label: string; amount: string };

export type BookingApi = {
  id: number;
  client: number;
  client_display: string;
  organizer: number;
  organizer_display: string;
  service: number | null;
  service_title: string | null;
  package: number | null;
  package_name: string | null;
  event_date: string;
  event_time?: string | null;
  guest_count?: number;
  event_type?: string;
  price_breakdown?: BookingPriceLine[];
  total_estimate?: string | null;
  booking_status: string;
  payment_status: string;
  notes: string;
  /** Visible to the client; set by the organizer (or admin). */
  organizer_notes?: string;
  created_at: string;
  updated_at: string;
};

export type ChatUserSnapshot = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  display_name: string;
};

export type MessageApi = {
  id: number;
  sender: number;
  receiver: number;
  sender_detail?: ChatUserSnapshot;
  receiver_detail?: ChatUserSnapshot;
  content: string;
  /** Absolute or relative image URL from API */
  image?: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationApi = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type EventPackageApi = {
  id: number;
  client: number;
  name: string;
  event_type: string;
  tier: string;
  guest_count: number;
  venue: string;
  event_date: string | null;
  notes: string;
  status: string;
  estimated_total: string;
  estimated_min: string;
  estimated_max: string;
  breakdown: Record<string, unknown>;
  items: PackageItemApi[];
  created_at: string;
  updated_at: string;
};

export type PackageItemApi = {
  id: number;
  package: number;
  service: number | null;
  category: number | null;
  tier: string;
  quantity: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type BudgetEstimateResponse = {
  total_estimate: number;
  min_estimate: number;
  max_estimate: number;
  breakdown: BudgetBreakdownLine[];
  suggestions: string[];
};

export type OrganizerEventPhotoApi = {
  id: number;
  image: string | null;
  caption: string;
  sort_order: number;
  created_at: string;
};

export type OrganizerProfileApi = {
  id: number;
  user: number;
  display_name?: string;
  contact_email?: string;
  average_rating?: number;
  services_count?: number;
  service_preview?: string[];
  service_types_preview?: string[];
  event_types_preview?: string[];
  price_range?: { min: number; max: number } | null;
  event_photos?: OrganizerEventPhotoApi[];
  company_name: string;
  description: string;
  approval_status: string;
  approval_notes: string;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUserApi = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BudgetBreakdownLine = {
  title?: string;
  category?: string;
  tier?: string;
  quantity?: number;
  estimated_price?: number;
  min_price?: number;
  max_price?: number;
  /** Listing not bookable or no positive rate for chosen tier — excluded from line total. */
  unavailable?: boolean;
  unavailable_reason?: "not_offered" | "no_rate";
};
