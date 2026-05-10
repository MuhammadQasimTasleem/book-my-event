import type { Metadata } from "next";

export const metadata: Metadata = { title: "Organizer Dashboard — Book My Event" };

export default function OrganizerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
