"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Package, Ticket, Truck, GraduationCap, BookOpen } from "lucide-react";
import {
  relativeTime,
  type ActivityEvent,
  type OverviewMetric,
  type UniverseHealth,
  type UniverseBadgeCounts,
} from "@/lib/universe/types";

const TYPE_ICON: Record<string, typeof Truck> = {
  load: Truck,
  ticket: Ticket,
  agent: Bot,
  enrollment: GraduationCap,
  system: Package,
  knowledge: BookOpen,
};

type OverviewPayload = {
  ok: boolean;
  configured?: boolean;
  overview: OverviewMetric[];
  activity: ActivityEvent[];
  health: UniverseHealth;
  badges: UniverseBadgeCounts;
};

export function useUniverseOverview() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const res = await fetch("/api/universe/overview");
        const json = (await res.json()) as OverviewPayload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void pull();
    const id = setInterval(pull, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { data, loading };
}

export function UniverseRightPanel() {
  const { data, loading } = useUniverseOverview();
  const activity = data?.activity ?? [];
  const overview = data?.overview ?? [];

  return (
    <aside className="flex h-full w-full max-w-[320px] flex-col gap-3 overflow-y-auto border-l border-sky-500/15 bg-[#060b14]/95 p-3 backdrop-blur-xl">
      <section
        id="activity"
        className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/8 bg-white/[0.03] p-3"
      >
        <div className="mb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">
            Recent tool activity
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            From your Alpha tool runs
          </p>
        </div>
        {loading ? (
          <p className="text-[12px] text-slate-500">Loading…</p>
        ) : activity.length === 0 ? (
          <p className="rounded-xl border border-white/5 bg-black/20 px-3 py-4 text-[12px] text-slate-500">
            No tool activity yet. Ask Alpha to search loads or Portal tickets.
          </p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {activity.map((ev) => {
              const Icon = TYPE_ICON[ev.type] || Bot;
              return (
                <li
                  key={ev.id}
                  className="rounded-xl border border-white/5 bg-black/20 px-2.5 py-2"
                >
                  <div className="flex gap-2">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-slate-100">
                        {ev.title}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {ev.detail}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {relativeTime(ev.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">
          Live overview
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(overview.length
            ? overview
            : [{ id: "x", label: "Status", value: "—", delta: 0 }]
          ).map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-white/5 bg-black/25 p-2.5"
            >
              <p className="text-[10px] text-slate-500">{m.label}</p>
              <p className="mt-1 font-mono text-lg text-slate-50">{m.value}</p>
            </div>
          ))}
        </div>
        <Link
          href="/universe/dispatch"
          className="mt-3 block text-center text-[11px] text-sky-400 hover:underline"
        >
          Open Dispatch →
        </Link>
      </section>
    </aside>
  );
}
