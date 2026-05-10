import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign In — Book My Event" };

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
