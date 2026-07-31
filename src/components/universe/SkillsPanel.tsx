"use client";

import { ALPHA_SKILLS } from "@/config/alpha-skills.config";
import { Sparkles } from "lucide-react";

/** Visible Claude-style skills strip for Universe. */
export function SkillsPanel({ compact = false }: { compact?: boolean }) {
  const active = ALPHA_SKILLS.filter((s) => s.status === "active");

  return (
    <section
      className={`w-full rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] backdrop-blur-xl ${
        compact ? "p-2.5" : "p-3"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <Sparkles size={14} className="text-violet-300" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200">
          Alpha Skills
        </p>
        <span className="text-[10px] text-slate-500">
          Claude-style · {active.length} loaded
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {active.map((s) => (
          <div
            key={s.id}
            className="min-w-[9.5rem] max-w-[11rem] shrink-0 rounded-xl border border-white/10 bg-black/35 px-2.5 py-2"
            title={s.description}
          >
            <p className="truncate text-[11px] font-medium text-slate-100">
              {s.name}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-slate-500">
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
