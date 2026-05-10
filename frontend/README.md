# Book My Event

A Next.js (App Router) front-end for **Book My Event** — an event management platform that connects clients with verified organizers across catering, decor, photography, music, venues, and planning.

The UI is inspired by the **Acaro – Catering & Event Planner** WordPress theme: warm cream, deep espresso, and gold accents with elegant serif typography.

## Stack

- **Next.js 15** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS 3** for styling (Acaro-inspired design tokens)
- **lucide-react** for icons
- Local mock data in `src/lib/data.ts` (swap for a real database later)

## Pages included

Public:

- `/` — Home (hero, categories, about strip, signature services, how it works, stats, recent events, testimonials, CTA)
- `/about` — About, team, values
- `/services` — Filterable services list (by category, city, keyword)
- `/services/[id]` — Service detail + booking sidebar
- `/venues` — Venue showcase
- `/package-builder` — Build a custom package with **live budget estimation**
- `/faq` — Frequently asked questions
- `/contact` — Contact form
- `/login`, `/register` — Auth (with role selection)

Dashboards:

- `/dashboard` — Workspace selector
- `/dashboard/client` — Overview, upcoming bookings, suggestions, activity
- `/dashboard/client/bookings` — All bookings table
- `/dashboard/client/messages` — Real-time-style chat
- `/dashboard/organizer` — Requests, my services, earnings
- `/dashboard/admin` — Verify organizers, moderate flagged reviews, system stats

## FRS coverage

| FR group | Where it lives |
|---|---|
| FR-1 User Account Management | `/login`, `/register`, `/dashboard/*/profile` (shell) |
| FR-2 Role Management | Role selector in `/register` + role-based dashboards |
| FR-3 Service Provider | `/dashboard/organizer` + `services` table |
| FR-4 Discovery & Search | `/services` filter + home search bar |
| FR-5 Package Customization | `/package-builder` |
| FR-6 Budget Estimation | `/package-builder` (live total) |
| FR-7 Booking Management | Service detail + organizer requests table |
| FR-8 Real-time Communication | `/dashboard/client/messages` |
| FR-9 Notifications | Activity feed + unread badges |
| FR-10 Reviews & Ratings | Service detail + admin moderation |
| FR-11 Admin Management | `/dashboard/admin` |
| FR-12 Data Management | Mock data in `src/lib/data.ts` |

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project structure

```
src/
  app/
    layout.tsx           # root layout w/ fonts + header/footer
    page.tsx             # home
    about/, services/, venues/, faq/, contact/
    package-builder/     # interactive builder w/ live budget
    login/, register/
    dashboard/
      layout.tsx         # shared sidebar
      client/, organizer/, admin/
  components/
    site-header.tsx, site-footer.tsx
    section-heading.tsx, page-hero.tsx
    service-card.tsx, stat-card.tsx
  lib/
    data.ts              # mock data + helpers
```

## Theme tokens (tailwind.config.ts)

- `cream` 50–300 — backgrounds
- `espresso` 50–400 — dark surfaces, headlines
- `gold` 50–500 — accent (primary action: `gold-300`)
- Fonts: **Playfair Display** (display), **Inter** (body), **Dancing Script** (eyebrow)

## Next steps to make it production-ready

1. Add a real auth provider (NextAuth / Clerk)
2. Wire to a database (Prisma + Postgres / Supabase) — replace `src/lib/data.ts`
3. Real-time chat via Supabase Realtime / Pusher / Socket.IO
4. Email notifications (Resend / Postmark)
5. Image uploads for organizer portfolios (UploadThing / S3)
6. Payment integration for booking deposits (Stripe / Easypaisa)
