import type { Metadata } from "next";

export const metadata: Metadata = { title: "Client Dashboard — Book My Event" };

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
