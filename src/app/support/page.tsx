"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/alpha/AppShell";
import clsx from "clsx";

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

const FILTERS = ["open", "human", "closed", "all"] as const;

export default function SupportInboxPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("open");
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

  const leadLine = sessionMeta
    ? [
        sessionMeta.lead_name,
        sessionMeta.lead_email,
        sessionMeta.lead_phone,
        sessionMeta.lead_role,
      ]
        .filter(Boolean)
        .join(" · ") || "No lead yet"
    : "";

  return (
    <AppShell email={email} centerOnly>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h1
              className="text-lg font-semibold tracking-tight text-[var(--color-text)] sm:text-xl"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Support inbox
            </h1>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              AFN public chats —{" "}
              <Link href="/" className="text-[var(--color-accent-2)] hover:underline">
                Chat
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={clsx(
                  "rounded-md px-2.5 py-1 text-xs capitalize",
                  filter === f
                    ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-2)]"
                    : "text-[var(--color-muted)] hover:bg-white/[0.04]"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="shrink-0 border-b border-red-900/40 bg-red-950/30 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="grid min-h-0 flex-1 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Session list — hide on phone when a chat is open */}
          <aside
            className={clsx(
              "min-h-0 overflow-y-auto border-[var(--color-border)] md:border-r",
              activeId ? "hidden md:block" : "block"
            )}
          >
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
                  className={clsx(
                    "block w-full border-b border-[var(--color-border)] px-4 py-3 text-left transition hover:bg-white/[0.03]",
                    activeId === s.id && "bg-[var(--color-accent-dim)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={clsx(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        s.status === "human"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : s.status === "closed"
                            ? "bg-white/5 text-[var(--color-muted)]"
                            : "bg-sky-500/15 text-sky-300"
                      )}
                    >
                      {s.status}
                    </span>
                    <span className="text-[11px] text-[var(--color-muted)]">
                      {new Date(s.last_message_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium text-[var(--color-text)]">
                    {s.lead_name || s.lead_email || "Anonymous visitor"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                    {s.preview || s.page_url || s.site_slug}
                  </p>
                </button>
              ))
            )}
          </aside>

          {/* Transcript */}
          <section
            className={clsx(
              "flex min-h-0 flex-col bg-[var(--color-bg)]",
              !activeId ? "hidden md:flex" : "flex"
            )}
          >
            {!activeId || !sessionMeta ? (
              <p className="m-auto text-sm text-[var(--color-muted)]">
                Select a conversation
              </p>
            ) : (
              <>
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-3 py-2.5 sm:px-4">
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-xs text-[var(--color-muted)] hover:bg-white/[0.04] md:hidden"
                    onClick={() => setActiveId(null)}
                  >
                    ← List
                  </button>
                  <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-accent-2)]">
                    {sessionMeta.status}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-muted)] sm:text-sm">
                    {leadLine}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={busy || sessionMeta.status === "closed"}
                      onClick={() => void act("join")}
                      className="rounded-md bg-[var(--color-accent)] px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    >
                      Join
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act("release")}
                      className="rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-muted)] disabled:opacity-40"
                    >
                      Release
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act("close")}
                      className="rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-muted)] disabled:opacity-40"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-5">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={clsx(
                        "max-w-[min(100%,36rem)] text-sm leading-relaxed",
                        m.role === "visitor" && "ml-auto",
                        m.role === "system" && "mx-auto max-w-md text-center"
                      )}
                    >
                      {m.role === "system" ? (
                        <p className="text-xs text-[var(--color-muted)]">
                          {m.content}
                        </p>
                      ) : (
                        <div
                          className={clsx(
                            "rounded-lg px-3 py-2",
                            m.role === "visitor"
                              ? "bg-[var(--color-accent-dim)] text-[var(--color-text)]"
                              : m.role === "staff"
                                ? "border border-[var(--color-accent)] bg-[var(--color-surface)]"
                                : "border border-[var(--color-border)] bg-[var(--color-surface)]"
                          )}
                        >
                          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                            {m.role === "staff"
                              ? "You (staff)"
                              : m.role === "visitor"
                                ? "Visitor"
                                : "Assistant"}
                          </p>
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <form
                  onSubmit={onSend}
                  className="flex shrink-0 gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4"
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Reply as staff…"
                    className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
                    disabled={busy || sessionMeta.status === "closed"}
                  />
                  <button
                    type="submit"
                    disabled={
                      busy || !draft.trim() || sessionMeta.status === "closed"
                    }
                    className="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
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
