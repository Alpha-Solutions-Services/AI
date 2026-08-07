"use client";

import clsx from "clsx";

type Mode = "idle" | "listening" | "thinking" | "speaking";

const LABELS: Record<Mode, string> = {
  idle: "Live · ready",
  listening: "Listening",
  thinking: "Working…",
  speaking: "Speaking",
};

/** Compact always-on status — modern, not a sci-fi orb. */
export function LiveStatus({
  mode = "idle",
  className,
}: {
  mode?: Mode;
  className?: string;
}) {
  const active = mode !== "idle";
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {active ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-40" />
        ) : null}
        <span
          className={clsx(
            "relative inline-flex h-2 w-2 rounded-full",
            mode === "listening"
              ? "bg-amber-400"
              : mode === "thinking"
                ? "bg-[var(--color-accent)]"
                : mode === "speaking"
                  ? "bg-emerald-400"
                  : "bg-emerald-400"
          )}
        />
      </span>
      <span className="text-xs font-medium text-[var(--color-chrome)]">
        {LABELS[mode]}
      </span>
    </div>
  );
}
