import { redirect } from "next/navigation";

/** Legacy / mistaken URLs — the add flow lives on the main My Services page. */
export default function OrganizerServicesAddRedirect() {
  redirect("/dashboard/organizer/services");
}
