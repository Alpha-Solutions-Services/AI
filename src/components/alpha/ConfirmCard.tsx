"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

export type PendingConfirm = {
  runId: string;
  toolName: string;
  args: Record<string, unknown>;
  description?: string;
};

export function ConfirmCard({
  item,
  onDone,
}: {
  item: PendingConfirm;
  onDone: (runId: string, status: string, result?: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "confirm" | "cancel") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: item.runId, decision }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      onDone(item.runId, json.status, json.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-chip rounded-2xl border-[var(--color-border-glow)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--color-accent)]">
        Confirm write action
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
        {item.toolName}
      </p>
      {item.description ? (
        <p className="mt-1 text-xs text-[var(--color-muted)]">{item.description}</p>
      ) : null}
      <pre className="mt-3 max-h-40 overflow-auto rounded-xl bg-[var(--color-bg)]/80 p-3 text-[11px] text-[var(--color-chrome)]">
        {JSON.stringify(item.args, null, 2)}
      </pre>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide("confirm")}
          className="inline-flex items-center gap-1 rounded-xl bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-[#05080f] disabled:opacity-50"
        >
          <Check size={14} /> Confirm
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide("cancel")}
          className="glass-chip inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs text-[var(--color-muted)] disabled:opacity-50"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}
