"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Send, Smile } from "lucide-react";
import { useAuth } from "@/components/providers";
import {
  createChatMessage,
  fetchChatMessages,
  getStoredTokens,
  markChatMessagesRead,
} from "@/lib/api/client";
import type { MessageApi } from "@/lib/api/types";
import { API_ORIGIN, chatWebSocketUrl } from "@/lib/config";
import { isClientUser, isOrganizerUser } from "@/lib/auth-roles";

const QUICK_EMOJIS = ["😀", "😊", "👍", "🎉", "❤️", "🙏", "✨", "💐", "🍰", "📅"];

function absMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = API_ORIGIN.replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

function threadMatch(msg: MessageApi, me: number, other: number): boolean {
  const s = Number(msg.sender);
  const r = Number(msg.receiver);
  const a = Number(me);
  const b = Number(other);
  return (s === a && r === b) || (r === a && s === b);
}

function parseWsData(raw: string): { kind: "message"; message: MessageApi } | { kind: "read_receipt"; messageIds: number[] } | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.type === "message" && o.message && typeof o.message === "object") {
    return { kind: "message", message: o.message as MessageApi };
  }
  if (o.type === "read_receipt") {
    const ids = o.message_ids;
    const messageIds = Array.isArray(ids) ? ids.map((x) => Number(x)) : [];
    return { kind: "read_receipt", messageIds };
  }
  if ("id" in o && "sender" in o && "receiver" in o) {
    return { kind: "message", message: o as MessageApi };
  }
  return null;
}

export default function ChatThreadPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const otherId = Number(params.userId);
  const [messages, setMessages] = useState<MessageApi[]>([]);
  const [text, setText] = useState("");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);

  const scrollBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadThread = useCallback(async () => {
    if (!Number.isFinite(otherId)) {
      setLoadErr("Invalid conversation.");
      return;
    }
    setLoadErr(null);
    try {
      const r = await fetchChatMessages({ withUserId: otherId, pageSize: 500 });
      setMessages(r.results);
      void markChatMessagesRead(otherId).catch(() => {});
      setTimeout(scrollBottom, 80);
    } catch {
      setLoadErr("Could not load this conversation.");
    }
  }, [otherId, scrollBottom]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/chat/${otherId}`)}`);
      return;
    }
    void loadThread();
  }, [authLoading, user, router, otherId, loadThread]);

  useEffect(() => {
    if (!user || !Number.isFinite(otherId)) return;

    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const me = user.id;

    const handlePayload = (parsed: ReturnType<typeof parseWsData>) => {
      if (!parsed || stopped) return;
      if (parsed.kind === "read_receipt") {
        setMessages((prev) =>
          prev.map((m) =>
            parsed.messageIds.includes(Number(m.id)) ? { ...m, is_read: true } : m
          )
        );
        return;
      }
      const msg = parsed.message;
      if (!msg?.id || !threadMatch(msg, me, otherId)) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (Number(msg.receiver) === me && Number(msg.sender) === otherId) {
        void markChatMessagesRead(otherId).catch(() => {});
      }
      setTimeout(scrollBottom, 50);
    };

    const connect = () => {
      if (stopped) return;
      const token = getStoredTokens()?.access;
      if (!token) return;

      const ws = new WebSocket(chatWebSocketUrl(token));
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempt.current = 0;
        void loadThread();
      };

      ws.onmessage = (ev) => {
        const parsed = parseWsData(String(ev.data));
        handlePayload(parsed);
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (stopped) return;
        const n = Math.min(6, reconnectAttempt.current + 1);
        reconnectAttempt.current = n;
        const delay = Math.min(8000, 500 * 2 ** n);
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user, otherId, scrollBottom, loadThread]);

  useEffect(() => {
    scrollBottom();
  }, [messages.length, scrollBottom]);

  const peerLabel = useMemo(() => {
    if (!Number.isFinite(otherId)) return "Chat";
    for (const m of messages) {
      if (m.sender === otherId && m.sender_detail?.display_name)
        return m.sender_detail.display_name;
      if (m.receiver === otherId && m.receiver_detail?.display_name)
        return m.receiver_detail.display_name;
    }
    return `User #${otherId}`;
  }, [messages, otherId]);

  const submitMessage = useCallback(async () => {
    const trimmed = text.trim();
    if ((!trimmed && !pendingImage) || !user || !Number.isFinite(otherId)) return;
    setSendErr(null);
    setSending(true);
    try {
      const msg = await createChatMessage({
        receiver: otherId,
        ...(trimmed ? { content: trimmed } : {}),
        ...(pendingImage ? { image: pendingImage } : {}),
      });
      setText("");
      setPendingImage(null);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setTimeout(scrollBottom, 50);
    } catch (ex: unknown) {
      let msg = "Could not send.";
      if (ex && typeof ex === "object" && "detail" in ex) {
        const d = (ex as { detail: unknown }).detail;
        if (typeof d === "object" && d && "receiver" in d) {
          const r = (d as { receiver?: unknown }).receiver;
          msg = Array.isArray(r) ? String(r[0]) : String(r);
        } else if (typeof d === "string") msg = d;
      }
      setSendErr(msg);
    } finally {
      setSending(false);
    }
  }, [text, pendingImage, user, otherId, scrollBottom]);

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    void submitMessage();
  };

  if (authLoading || !user) {
    return <div className="py-24 text-center text-sm text-muted">Loading…</div>;
  }

  if (!Number.isFinite(otherId)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="text-sm text-rose-800">Invalid user.</p>
        <Link href="/organizers" className="mt-4 inline-block text-gold-600 hover:underline">
          ← Organizers
        </Link>
      </div>
    );
  }

  const backHref =
    user.role === "organizer"
      ? "/dashboard/organizer/messages"
      : user.role === "client"
        ? "/dashboard/client/messages"
        : "/organizers";

  const canSend = Boolean(text.trim() || pendingImage);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-gold-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Inbox
        </Link>
      </div>

      <div className="rounded-2xl border border-espresso-200/12 bg-white shadow-soft">
        <div className="border-b border-espresso-200/10 px-5 py-4">
          <h1 className="font-serif text-xl text-espresso-200">{peerLabel}</h1>
          <p className="mt-0.5 text-xs text-muted">
            {isClientUser(user) && (
              <>
                You’re messaging as a client. Be specific about your event date and needs.
              </>
            )}
            {isOrganizerUser(user) && <>You’re replying as the organizer.</>}
          </p>
        </div>

        {loadErr ? (
          <p className="px-5 py-8 text-sm text-rose-800">{loadErr}</p>
        ) : (
          <div className="max-h-[min(52vh,480px)] space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                No messages yet — say hello below.
              </p>
            ) : (
              messages.map((m) => {
                const mine = Number(m.sender) === Number(user.id);
                const imgSrc = absMediaUrl(m.image ?? null);
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        mine
                          ? "bg-gold-300/90 text-espresso-200"
                          : "border border-espresso-200/15 bg-cream-50 text-espresso-200"
                      }`}
                    >
                      {imgSrc ? (
                        <a
                          href={imgSrc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-2 block overflow-hidden rounded-xl"
                        >
                          <Image
                            src={imgSrc}
                            alt=""
                            width={320}
                            height={240}
                            unoptimized
                            className="h-auto max-h-48 w-full object-cover"
                          />
                        </a>
                      ) : null}
                      {m.content?.trim() ? (
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      ) : null}
                      <div
                        className={`mt-1 flex flex-wrap items-center gap-x-2 text-[10px] uppercase tracking-wider ${
                          mine ? "text-espresso-200/70" : "text-muted"
                        }`}
                      >
                        <span>{new Date(m.created_at).toLocaleString()}</span>
                        {mine ? (
                          <span aria-label={m.is_read ? "Seen" : "Delivered"}>
                            {m.is_read ? "Seen" : "Delivered"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
        )}

        <form
          onSubmit={onSend}
          className="space-y-2 border-t border-espresso-200/10 p-4"
        >
          {pendingImage ? (
            <div className="flex items-center gap-2 rounded-xl border border-espresso-200/15 bg-cream-50/80 px-3 py-2 text-xs text-espresso-200">
              <span className="truncate">{pendingImage.name}</span>
              <button
                type="button"
                className="ml-auto text-rose-600 hover:underline"
                onClick={() => setPendingImage(null)}
              >
                Remove
              </button>
            </div>
          ) : null}

          {showEmoji ? (
            <div className="flex flex-wrap gap-1 rounded-xl border border-espresso-200/12 bg-cream-50/50 p-2">
              {QUICK_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  className="rounded-lg p-1.5 text-lg leading-none hover:bg-white"
                  onClick={() => {
                    setText((t) => t + em);
                    setShowEmoji(false);
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex gap-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              id="chat-image"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPendingImage(f);
                e.target.value = "";
              }}
            />
            <label
              htmlFor="chat-image"
              className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-espresso-200/25 bg-cream-50 px-3 text-espresso-200 hover:bg-cream-100"
              title="Attach image"
            >
              <ImagePlus className="h-5 w-5" aria-hidden />
            </label>
            <button
              type="button"
              className={`inline-flex shrink-0 items-center justify-center rounded-xl border px-3 ${
                showEmoji
                  ? "border-gold-400 bg-gold-50 text-espresso-200"
                  : "border-espresso-200/25 bg-cream-50 text-espresso-200 hover:bg-cream-100"
              }`}
              title="Emoji"
              onClick={() => setShowEmoji((v) => !v)}
            >
              <Smile className="h-5 w-5" aria-hidden />
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message… (emoji & images supported)"
              rows={1}
              className="min-h-[48px] min-w-0 flex-1 resize-y rounded-xl border border-espresso-200/20 bg-cream-50/50 px-4 py-3 text-sm text-espresso-200 outline-none ring-gold-400/30 focus:ring-2"
              maxLength={4000}
              disabled={!!loadErr || sending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend && !sending && !loadErr) void submitMessage();
                }
              }}
            />
            <button
              type="submit"
              disabled={!!loadErr || sending || !canSend}
              className="inline-flex shrink-0 items-center gap-2 self-end rounded-xl bg-espresso-200 px-4 py-3 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-espresso-200/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden />
              Send
            </button>
          </div>
        </form>
        {sendErr ? (
          <p className="border-t border-rose-200/30 px-4 py-2 text-xs text-rose-800">{sendErr}</p>
        ) : null}
      </div>
    </div>
  );
}
