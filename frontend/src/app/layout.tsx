import type { Metadata } from "next";
import { Playfair_Display, Inter, Dancing_Script } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const script = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Book My Event — Curated Catering & Event Planning",
  description:
    "Plan, customize and book unforgettable events. Connect with verified organizers, build packages, estimate budgets, and manage every detail in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${script.variable}`}
    >
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
