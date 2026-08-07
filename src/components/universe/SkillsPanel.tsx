"use client";

import { ALPHA_SKILLS } from "@/config/alpha-skills.config";
import { Sparkles } from "lucide-react";

/** Skills strip — flat, no purple glass wall. */
export function SkillsPanel({ compact = false }: { compact?: boolean }) {
  const active = ALPHA_SKILLS.filter((s) => s.status === "active");

  return (
    <section
      className={`w-full ${compact ? "py-1" : "py-2"}`}
    >
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <Sparkles size={13} className="text-[var(--color-accent-2)]" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Skills
        </p>
        <span className="text-[10px] text-[var(--color-muted)]">
          {active.length} active
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {active.map((s) => (
          <div
            key={s.id}
            className="min-w-[9rem] max-w-[11rem] shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2"
            title={s.description}
          >
            <p className="truncate text-[11px] font-medium text-[var(--color-text)]">
              {s.name}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-[var(--color-muted)]">
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
