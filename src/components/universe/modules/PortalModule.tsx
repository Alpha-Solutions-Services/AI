"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Ticket } from "lucide-react";

type Row = Record<string, unknown>;

export default function PortalModule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [tickets, setTickets] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Row[]>([]);
  const [inquiries, setInquiries] = useState<Row[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/universe/portal");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setMetrics(json.metrics || {});
      setTickets(Array.isArray(json.tickets) ? json.tickets : []);
      setProjects(Array.isArray(json.projects) ? json.projects : []);
      setInquiries(Array.isArray(json.inquiries) ? json.inquiries : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portal");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-300">Live Portal CRM data</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-sky-300"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </div>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Tickets", metrics.openTickets],
          ["Projects", metrics.projects],
          ["Inquiries", metrics.inquiries],
          ["Contracts", metrics.contracts],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-sky-400/20 bg-sky-500/5 px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className="font-mono text-lg text-sky-100">{value ?? 0}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10">
        <p className="bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500">
          Recent tickets
        </p>
        <ul className="divide-y divide-white/5">
          {tickets.length === 0 && !loading ? (
            <li className="px-3 py-4 text-center text-sm text-slate-500">
              No tickets
            </li>
          ) : null}
          {tickets.map((t) => (
            <li key={String(t.id)} className="flex items-start gap-2 px-3 py-2.5 text-[12px]">
              <Ticket size={12} className="mt-0.5 text-sky-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-slate-100">{String(t.subject || "—")}</p>
                <p className="text-[10px] text-slate-500">
                  {String(t.status || "")} · {String(t.client_email || "")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-white/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Projects
          </p>
          <ul className="mt-2 space-y-1.5 text-[12px] text-slate-300">
            {projects.slice(0, 6).map((p) => (
              <li key={String(p.id)} className="truncate">
                {String(p.title || p.name || p.id)}
              </li>
            ))}
            {!projects.length ? (
              <li className="text-slate-500">No projects</li>
            ) : null}
          </ul>
        </section>
        <section className="rounded-2xl border border-white/10 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Inquiries
          </p>
          <ul className="mt-2 space-y-1.5 text-[12px] text-slate-300">
            {inquiries.slice(0, 6).map((i) => (
              <li key={String(i.id)} className="truncate">
                {String(i.name || i.email || i.id)} · {String(i.status || "")}
              </li>
            ))}
            {!inquiries.length ? (
              <li className="text-slate-500">No inquiries</li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
