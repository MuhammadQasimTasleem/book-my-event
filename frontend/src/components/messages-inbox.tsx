"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/components/providers";
import { fetchChatMessages } from "@/lib/api/client";
import type { MessageApi } from "@/lib/api/types";

function partnerId(m: MessageApi, me: number): number {
  return m.sender === me ? m.receiver : m.sender;
}

function partnerLabel(m: MessageApi, me: number): string {
  const other = m.sender === me ? m.receiver_detail : m.sender_detail;
  return other?.display_name || other?.email || `User #${partnerId(m, me)}`;
}

export default function MessagesInbox() {
  const { user } = useAuth();
  const [list, setList] = useState<MessageApi[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetchChatMessages({ pageSize: 100 });
      setList(r.results);
    } catch {
      setErr("Could not load messages.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const threads = useMemo(() => {
    if (!user) return [];
    const me = user.id;
    const map = new Map<
      number,
      { partnerId: number; last: MessageApi; preview: string }
    >();
    for (const m of list) {
      const pid = partnerId(m, me);
      const cur = map.get(pid);
      if (!cur || new Date(m.created_at) > new Date(cur.last.created_at)) {
        map.set(pid, {
          partnerId: pid,
          last: m,
          preview: m.content,
        });
      }
    }
    return [...map.values()].sort(
      (a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime()
    );
  }, [list, user]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-espresso-200">Messages</h1>
        <p className="mt-1 text-sm text-muted">
          Open a conversation to continue chatting. New threads start from an organizer profile
          (clients) or after you exchange messages (organizers).
        </p>
      </div>

      {err && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {err}
        </p>
      )}

      {!err && threads.length === 0 ? (
        <div className="rounded-2xl border border-espresso-200/12 bg-white p-10 text-center shadow-soft">
          <MessageCircle className="mx-auto h-10 w-10 text-gold-400/80" aria-hidden />
          <p className="mt-4 text-sm text-muted">No conversations yet.</p>
          {user.role === "client" ? (
            <Link
              href="/organizers"
              className="mt-4 inline-block text-sm font-medium text-gold-600 hover:underline"
            >
              Browse organizers
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.partnerId}>
              <Link
                href={`/chat/${t.partnerId}`}
                className="flex flex-col gap-1 rounded-2xl border border-espresso-200/12 bg-white px-5 py-4 shadow-sm transition hover:border-gold-400/35 hover:shadow-md"
              >
                <span className="font-medium text-espresso-200">
                  {partnerLabel(t.last, user.id)}
                </span>
                <span className="line-clamp-2 text-sm text-muted">{t.preview}</span>
                <span className="text-[11px] uppercase tracking-wider text-muted">
                  {new Date(t.last.created_at).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
