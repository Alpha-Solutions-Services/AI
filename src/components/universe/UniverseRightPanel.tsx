"use client";

import Link from "next/link";
import {
  Bot,
  FileArchive,
  Package,
  Receipt,
  Target,
  Ticket,
  Truck,
  GraduationCap,
} from "lucide-react";
import {
  MOCK_ACTIVITY,
  MOCK_OVERVIEW,
  relativeTime,
  type ActivityEventType,
} from "@/lib/universe/types";
import { Sparkline } from "@/components/universe/UniverseCharts";

const TYPE_ICON: Record<ActivityEventType, typeof Truck> = {
  load: Truck,
  invoice: Receipt,
  lead: Target,
  agent: Bot,
  backup: FileArchive,
  ticket: Ticket,
  enrollment: GraduationCap,
  system: Package,
};

export function UniverseRightPanel() {
  return (
    <aside className="flex h-full w-full max-w-[320px] flex-col gap-3 overflow-y-auto border-l border-sky-500/15 bg-[#060b14]/95 p-3 backdrop-blur-xl">
      <section
        id="activity"
        className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/8 bg-white/[0.03] p-3"
      >
        <div className="mb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">
            Universe Activity
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Real-time events across orbits
          </p>
        </div>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {MOCK_ACTIVITY.map((ev) => {
            const Icon = TYPE_ICON[ev.type];
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
                    <p className="truncate text-[11px] text-slate-500">{ev.detail}</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      {relativeTime(ev.createdAt)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <Link
          href="/universe#activity"
          className="mt-3 text-center text-[11px] text-sky-400 hover:underline"
        >
          View All Activity
        </Link>
      </section>

      <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">
          Universe Overview
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {MOCK_OVERVIEW.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-white/5 bg-black/25 p-2.5"
            >
              <p className="text-[10px] text-slate-500">{m.label}</p>
              <p className="mt-1 font-mono text-lg text-slate-50">{m.value}</p>
              <p
                className={`text-[10px] font-medium ${
                  m.delta >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {m.delta >= 0 ? "+" : ""}
                {m.delta}%
              </p>
              {m.sparkline ? (
                <Sparkline
                  points={m.sparkline}
                  className="mt-1.5 h-6 w-full"
                  stroke={m.id === "accuracy" ? "#38bdf8" : "#34d399"}
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
