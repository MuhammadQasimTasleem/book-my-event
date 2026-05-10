import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Book My Event" };

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
