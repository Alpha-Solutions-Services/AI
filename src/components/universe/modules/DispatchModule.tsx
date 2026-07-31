"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Truck } from "lucide-react";

type QueuePayload = {
  table?: string;
  byStatus?: Record<string, number>;
  sample?: Array<Record<string, unknown>>;
};

type LoadRow = Record<string, unknown>;

/**
 * Real Dispatch module — data from BFF that calls existing tms_* tool queries.
 */
export default function DispatchModule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [loads, setLoads] = useState<LoadRow[]>([]);
  const [q, setQ] = useState("");

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(
        query ? { view: "loads", q: query } : { view: "queue" }
      );
      const res = await fetch(`/api/universe/dispatch?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      if (!json.ok) throw new Error(json.error || json.summary || "Dispatch query failed");

      setSummary(json.summary || "");
      if (json.view === "loads") {
        setLoads(Array.isArray(json.loads) ? json.loads : []);
        setByStatus({});
      } else {
        const data = json.data as QueuePayload | null;
        setByStatus(data?.byStatus || {});
        setLoads(Array.isArray(data?.sample) ? data!.sample! : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dispatch");
      setLoads([]);
      setByStatus({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void load(q.trim() || undefined);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search loads (ref, origin, dest, status)…"
            className="min-w-0 flex-1 rounded-xl border border-cyan-400/25 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
          />
          <button
            type="submit"
            className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-200"
          >
            Search
          </button>
        </form>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-cyan-300"
        >
          <RefreshCw size={14} /> Queue
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} /> Loading TMS data…
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      ) : null}

      {summary && !error ? (
        <p className="text-xs text-cyan-300/90">{summary}</p>
      ) : null}

      {Object.keys(byStatus).length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(byStatus).map(([status, count]) => (
            <div
              key={status}
              className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-3 py-2"
            >
              <p className="truncate text-[10px] uppercase tracking-wider text-slate-500">
                {status}
              </p>
              <p className="font-mono text-lg text-cyan-100">{count}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2">Load</th>
              <th className="px-3 py-2">Route</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loads.length === 0 && !loading ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                  No loads returned — check TMS tables / service role.
                </td>
              </tr>
            ) : null}
            {loads.map((row, i) => {
              const id = String(row.id ?? row.reference ?? i);
              const ref = String(row.reference ?? row.id ?? "—");
              const origin = String(row.origin ?? row.from ?? "—");
              const dest = String(row.destination ?? row.to ?? "—");
              const status = String(row.status ?? "—");
              return (
                <tr
                  key={id}
                  className="border-t border-white/5 text-slate-300 hover:bg-cyan-500/5"
                >
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Truck size={12} className="text-cyan-400" />
                      <span className="font-mono text-slate-100">{ref}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {origin} → {dest}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200">
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
