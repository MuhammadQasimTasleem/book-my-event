"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/providers";
import { isClientUser } from "@/lib/auth-roles";

type Props = {
  organizerUserId: number;
  className?: string;
  /** Shorter label for tight card layouts */
  compact?: boolean;
};

/**
 * Lets a signed-in **client** open a thread with this organizer.
 * Organizers reach clients from the dashboard inbox; public cards stay client-initiated.
 */
export function OrganizerChatButton({
  organizerUserId,
  className,
  compact,
}: Props) {
  const { user, loading } = useAuth();
  if (loading) return null;
  const next = encodeURIComponent(`/chat/${organizerUserId}`);
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl border border-teal-700/25 bg-teal-50/90 px-4 py-2.5 text-sm font-semibold text-teal-950 shadow-sm transition hover:border-teal-600/40 hover:bg-teal-50";
  if (!user) {
    return (
      <Link
        href={`/login?next=${next}`}
        className={clsx(base, className)}
        prefetch={false}
      >
        <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
        {compact ? "Chat" : "Sign in to message"}
      </Link>
    );
  }
  if (user.id === organizerUserId) return null;
  if (!isClientUser(user)) return null;
  return (
    <Link href={`/chat/${organizerUserId}`} className={clsx(base, className)} prefetch={false}>
      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
      {compact ? "Chat" : "Message organizer"}
    </Link>
  );
}
