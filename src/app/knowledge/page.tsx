"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/alpha/AppShell";

type Status = {
  documents: number;
  chunks: number;
  sourceCounts: Record<string, number>;
  recentRuns: {
    id: string;
    status: string;
    docs_upserted: number;
    chunks_upserted: number;
    started_at: string;
    finished_at: string | null;
    error: string | null;
  }[];
};

export default function KnowledgePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const [me, st] = await Promise.all([
      fetch("/api/me").then((r) => r.json()),
      fetch("/api/knowledge/status").then((r) => r.json()),
    ]);
    setEmail(me.email ?? null);
    if (!st.error) setStatus(st);
  }

  useEffect(() => {
    void load();
  }, []);

  async function refresh() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/knowledge/ingest", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Ingest failed");
      setMsg(
        `Indexed ${json.docs} docs / ${json.chunks} chunks` +
          (json.error ? ` (partial: ${json.error})` : "")
      );
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell email={email} centerOnly>
      <div className="mx-auto w-full max-w-3xl overflow-y-auto px-4 py-6 md:px-6">
        <h1
          className="text-2xl uppercase tracking-[0.16em] text-[var(--color-accent-2)]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          Knowledge
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Alpha studies marketing, Portal, TMS, Learn Dispatch, Sanity, and
          portal_knowledge. Nightly cron + manual refresh.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs text-[var(--color-muted)]">Documents</p>
            <p className="mt-1 text-2xl text-[var(--color-accent)]">
              {status?.documents ?? "—"}
            </p>
          </div>
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs text-[var(--color-muted)]">Chunks</p>
            <p className="mt-1 text-2xl text-[var(--color-accent)]">
              {status?.chunks ?? "—"}
            </p>
          </div>
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs text-[var(--color-muted)]">Sources</p>
            <p className="mt-1 text-sm text-[var(--color-chrome)]">
              {status
                ? Object.entries(status.sourceCounts)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ") || "none yet"
                : "—"}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void refresh()}
          className="mt-6 bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[#05080f] disabled:opacity-50"
        >
          {busy ? "Refreshing…" : "Refresh knowledge now"}
        </button>
        {msg ? (
          <p className="mt-3 text-sm text-[var(--color-chrome)]">{msg}</p>
        ) : null}

        <h2 className="mt-10 text-lg text-[var(--color-text)]">Recent runs</h2>
        <ul className="mt-3 space-y-2">
          {(status?.recentRuns || []).map((run) => (
            <li
              key={run.id}
              className="border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-3 py-2 text-xs text-[var(--color-muted)]"
            >
              {run.status} · {run.docs_upserted} docs · {run.chunks_upserted}{" "}
              chunks · {new Date(run.started_at).toLocaleString()}
              {run.error ? ` · ${run.error}` : ""}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
