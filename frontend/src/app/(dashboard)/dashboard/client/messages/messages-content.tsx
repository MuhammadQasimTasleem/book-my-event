"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Paperclip, Search, Send, Smile } from "lucide-react";
import { fetchMessages, getStoredTokens, sendMessage } from "@/lib/api/client";
import type { MessageApi } from "@/lib/api/types";
import { chatWebSocketUrl } from "@/lib/config";
import { useAuth } from "@/components/providers";

type Partner = {
  id: number;
  label: string;
  last: string;
  unread: number;
};

function buildPartners(list: MessageApi[], me: number): Partner[] {
  const map = new Map<number, { last: string; unread: number }>();
  for (const m of list) {
    const other = m.sender === me ? m.receiver : m.sender;
    const prev = map.get(other);
    const unread =
      (prev?.unread ?? 0) + (m.receiver === me && !m.is_read ? 1 : 0);
    map.set(other, {
      last: m.content,
      unread,
    });
  }
  return Array.from(map.entries()).map(([id, v]) => ({
    id,
    label: `User #${id}`,
    last: v.last,
    unread: v.unread,
  }));
}

export default function MessagesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const withParam = search.get("with");
  const [messages, setMessages] = useState<MessageApi[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const data = await fetchMessages();
    const list = data.results;
    setMessages(list);
    setPartners(buildPartners(list, user.id));
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const next =
        pathname?.includes("organizer") === true
          ? "/dashboard/organizer/messages"
          : "/dashboard/client/messages";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (user.role !== "client" && user.role !== "organizer") {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [user, authLoading, router, load, pathname]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 4500);
    return () => clearInterval(id);
  }, [user, load]);

  useEffect(() => {
    if (!user) return;
    const tokens = getStoredTokens();
    if (!tokens?.access) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(chatWebSocketUrl(tokens.access));
    } catch {
      return;
    }
    ws.onmessage = () => void load();
    ws.onerror = () => ws.close();
    return () => ws.close();
  }, [user, load]);

  useEffect(() => {
    if (partners.length === 0 || activeId !== null) return;
    const want = withParam ? Number(withParam) : NaN;
    if (Number.isFinite(want) && partners.some((p) => p.id === want)) {
      setActiveId(want);
    } else {
      setActiveId(partners[0].id);
    }
  }, [partners, activeId, withParam]);

  const filteredPartners = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return partners;
    return partners.filter(
      (p) =>
        p.label.toLowerCase().includes(qq) || p.last.toLowerCase().includes(qq)
    );
  }, [partners, q]);

  const thread = useMemo(() => {
    if (!user || !activeId) return [];
    const me = user.id;
    return messages
      .filter(
        (m) =>
          (m.sender === me && m.receiver === activeId) ||
          (m.sender === activeId && m.receiver === me)
      )
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [messages, user, activeId]);

  const send = async () => {
    if (!draft.trim() || !user || !activeId) return;
    await sendMessage({ receiver: activeId, content: draft.trim() });
    setDraft("");
    await load();
  };

  if (authLoading || !user) {
    return <div className="py-20 text-center text-sm text-muted">Loading…</div>;
  }

  const active = partners.find((p) => p.id === activeId);

  return (
    <div className="grid h-[80vh] overflow-hidden rounded-3xl border border-espresso-200/10 bg-white shadow-soft md:grid-cols-[320px_1fr]">
      <aside className="flex flex-col border-r border-espresso-200/10 bg-cream-100/40">
        <div className="border-b border-espresso-200/10 p-4">
          <h2 className="font-serif text-xl text-espresso-200">Messages</h2>
          <div className="relative mt-3">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              placeholder="Search conversations"
              className="input py-2.5 pl-9 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {filteredPartners.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted">No conversations yet.</li>
          ) : (
            filteredPartners.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    activeId === c.id
                      ? "bg-white shadow-inner"
                      : "hover:bg-white/60"
                  }`}
                >
                  <span className="relative">
                    <Image
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.label)}&background=f5e6c8&color=3d2c29`}
                      alt={c.label}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between">
                      <span className="truncate font-medium text-espresso-200">
                        {c.label}
                      </span>
                      {c.unread > 0 && (
                        <span className="ml-2 rounded-full bg-gold-300 px-2 text-[10px] font-medium text-espresso-200">
                          {c.unread}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {c.last}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <section className="flex h-full min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-espresso-200/10 p-4">
          {active && (
            <>
              <Image
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(active.label)}&background=f5e6c8&color=3d2c29`}
                alt={active.label}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-espresso-200">{active.label}</p>
                <p className="text-xs text-muted">Direct message</p>
              </div>
            </>
          )}
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-cream-100/30 p-5">
          {thread.map((m) => {
            const mine = user && m.sender === user.id;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-soft ${
                    mine
                      ? "rounded-br-sm bg-espresso-200 text-cream-50"
                      : "rounded-bl-sm bg-white text-espresso-200"
                  }`}
                >
                  {m.content}
                  <span
                    className={`mt-1 block text-[10px] uppercase tracking-[0.18em] ${
                      mine ? "text-cream-100/60" : "text-muted"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="border-t border-espresso-200/10 p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-gold-400"
              aria-label="Attach"
            >
              <Paperclip size={16} />
            </button>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-gold-400"
              aria-label="Emoji"
            >
              <Smile size={16} />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send()}
              placeholder="Type a message…"
              className="input flex-1"
              disabled={!activeId}
            />
            <button
              type="button"
              onClick={() => void send()}
              className="grid h-10 w-10 place-items-center rounded-full bg-gold-300 text-espresso-200 hover:bg-espresso-200 hover:text-cream-50"
              disabled={!activeId}
            >
              <Send size={15} />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
