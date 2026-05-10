import type { Metadata } from "next";
import DashboardLandingClient from "./landing-client";

export const metadata: Metadata = { title: "Dashboard — Book My Event" };

export default function DashboardLanding() {
  return <DashboardLandingClient />;
}
