"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/alpha/AppShell";

type SessionRow = {
  id: string;
  site_slug: string;
  status: string;
  page_url: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_role: string | null;
  assigned_staff_email: string | null;
  last_message_at: string;
  preview: string | null;
};

type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

export default function SupportInboxPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "human" | "closed" | "all">(
    "open"
  );
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionMeta, setSessionMeta] = useState<SessionRow | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    const res = await fetch(
      `/api/support/staff/sessions?site=afn&status=${filter}`
    );
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load");
      return;
    }
    setSessions(json.sessions || []);
  }, [filter]);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/support/staff/sessions/${id}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load session");
      return;
    }
    setSessionMeta(json.session);
    setMessages(json.messages || []);
  }, []);

  useEffect(() => {
    void fetch("/api/me")
      .then((r) => r.json())
      .then((j) => setEmail(j.email ?? null));
  }, []);

  useEffect(() => {
    void loadSessions();
    const t = setInterval(() => void loadSessions(), 4000);
    return () => clearInterval(t);
  }, [loadSessions]);

  useEffect(() => {
    if (!activeId) return;
    void loadDetail(activeId);
    const t = setInterval(() => void loadDetail(activeId), 2500);
    return () => clearInterval(t);
  }, [activeId, loadDetail]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function act(action: "join" | "release" | "close" | "message") {
    if (!activeId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/staff/sessions/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          content: action === "message" ? draft : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      if (action === "message") setDraft("");
      await Promise.all([loadDetail(activeId), loadSessions()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  function onSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    void act("message");
  }

  return (
    <AppShell email={email} centerOnly>
      <div className="mx-auto flex h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col px-3 py-4 md:px-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1
              className="text-xl uppercase tracking-[0.16em] text-[var(--color-accent-2)] md:text-2xl"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Support inbox
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              AFN public chats — join as human when needed.{" "}
              <Link href="/" className="text-[var(--color-accent)] underline">
                Jarvis
              </Link>
            </p>
          </div>
          <div className="flex gap-2 text-xs uppercase tracking-wider">
            {(["open", "human", "closed", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`border px-3 py-1 ${
                  filter === f
                    ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="mb-2 text-sm text-red-400">{error}</p>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[280px_1fr]">
          <aside className="overflow-y-auto border border-[var(--color-border)] bg-[var(--color-surface)]">
            {sessions.length === 0 ? (
              <p className="p-4 text-sm text-[var(--color-muted)]">
                No sessions yet.
              </p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={`block w-full border-b border-[var(--color-border)] px-3 py-3 text-left hover:bg-black/20 ${
                    activeId === s.id ? "bg-black/30" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                      {s.status}
                    </span>
                    <span className="text-[10px] text-[var(--color-muted)]">
                      {new Date(s.last_message_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm">
                    {s.lead_name || s.lead_email || "Anonymous visitor"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                    {s.preview || s.page_url || s.site_slug}
                  </p>
                </button>
              ))
            )}
          </aside>

          <section className="flex min-h-0 flex-col border border-[var(--color-border)] bg-[var(--color-surface)]">
            {!activeId || !sessionMeta ? (
              <p className="m-auto text-sm text-[var(--color-muted)]">
                Select a session
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
                  <span className="text-xs uppercase tracking-wider text-[var(--color-accent-2)]">
                    {sessionMeta.status}
                  </span>
                  <span className="text-xs text-[var(--color-muted)]">
                    {[
                      sessionMeta.lead_name,
                      sessionMeta.lead_email,
                      sessionMeta.lead_phone,
                      sessionMeta.lead_role,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No lead yet"}
                  </span>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || sessionMeta.status === "closed"}
                      onClick={() => void act("join")}
                      className="border border-[var(--color-accent)] px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-accent)] disabled:opacity-40"
                    >
                      Join
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act("release")}
                      className="border border-[var(--color-border)] px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-muted)] disabled:opacity-40"
                    >
                      Release to AI
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act("close")}
                      className="border border-[var(--color-border)] px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-muted)] disabled:opacity-40"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[85%] text-sm ${
                        m.role === "visitor"
                          ? "ml-auto bg-[var(--color-accent)]/15 px-3 py-2"
                          : m.role === "staff"
                            ? "border border-[var(--color-accent-2)] px-3 py-2"
                            : m.role === "system"
                              ? "mx-auto text-center text-xs text-[var(--color-muted)]"
                              : "border border-[var(--color-border)] px-3 py-2"
                      }`}
                    >
                      {m.role !== "system" ? (
                        <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                          {m.role}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <form
                  onSubmit={onSend}
                  className="flex gap-2 border-t border-[var(--color-border)] p-3"
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Message as staff…"
                    className="flex-1 border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                    disabled={busy || sessionMeta.status === "closed"}
                  />
                  <button
                    type="submit"
                    disabled={busy || !draft.trim() || sessionMeta.status === "closed"}
                    className="bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
