"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/components/providers";

export function MessageOrganizerCta({ userId }: { userId: number }) {
  const { user } = useAuth();

  if (!user) {
    const next = `/organizers/${userId}`;
    return (
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="btn-primary h-fit shrink-0 self-start"
      >
        <MessageCircle size={16} />
        Sign in to message
      </Link>
    );
  }

  if (user.role === "organizer" && user.id === userId) {
    return (
      <p className="text-xs text-muted">
        This is your public profile — clients message you from their account.
      </p>
    );
  }

  const base =
    user.role === "organizer"
      ? "/dashboard/organizer/messages"
      : "/dashboard/client/messages";

  return (
    <Link href={`${base}?with=${userId}`} className="btn-primary h-fit shrink-0 self-start">
      <MessageCircle size={16} />
      Message organizer
    </Link>
  );
}
