import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create account — Book My Event" };

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
