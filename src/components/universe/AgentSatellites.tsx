"use client";

import { useEffect, useState } from "react";
import {
  UNIVERSE_AGENTS,
  statusColor,
  type AgentRuntimeStatus,
} from "@/config/agents.config";
import { useUniverse } from "@/components/universe/UniverseProvider";

type AgentRow = (typeof UNIVERSE_AGENTS)[number] & {
  runtime: {
    status: AgentRuntimeStatus;
    task: string | null;
    recent: string[];
  };
};

export function AgentSatellites({
  size = 160,
}: {
  size?: number;
}) {
  const { agentStatus } = useUniverse();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [selected, setSelected] = useState<AgentRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const res = await fetch("/api/universe/agents");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && Array.isArray(json.agents)) setAgents(json.agents);
      } catch {
        /* ignore */
      }
    }
    void pull();
    const id = setInterval(pull, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const list =
    agents.length > 0
      ? agents
      : UNIVERSE_AGENTS.map((a) => ({
          ...a,
          runtime: {
            status: "idle" as const,
            task: null,
            recent: [] as string[],
          },
        }));

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
      <div className="relative" style={{ width: size, height: size }}>
        {list.map((a) => {
          const rad = (a.angleDeg * Math.PI) / 180;
          const r = (size / 2) * a.radius;
          const x = size / 2 + Math.cos(rad) * r;
          const y = size / 2 + Math.sin(rad) * r;
          let st = a.runtime.status;
          // Reflect live Alpha work on ops satellite
          if (a.id === "ops" && agentStatus === "thinking") st = "processing";
          if (a.id === "ops" && agentStatus === "listening") st = "waiting";
          const color = statusColor(st);
          return (
            <button
              key={a.id}
              type="button"
              title={a.name}
              className="pointer-events-auto absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30"
              style={{
                left: x,
                top: y,
                background: color,
                boxShadow: `0 0 10px ${color}`,
              }}
              onClick={() => setSelected(a)}
            />
          );
        })}
      </div>

      {selected ? (
        <div className="pointer-events-auto absolute left-1/2 top-full z-30 mt-2 w-52 -translate-x-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[var(--color-text)]">
              {selected.name}
            </p>
            <button
              type="button"
              className="text-[10px] text-[var(--color-muted)]"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
            Status:{" "}
            <span style={{ color: statusColor(selected.runtime.status) }}>
              {selected.runtime.status}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {selected.runtime.task || "Idle — waiting for requests"}
          </p>
          {selected.runtime.recent.length ? (
            <ul className="mt-2 space-y-1 border-t border-white/5 pt-2 text-[10px] text-slate-500">
              {selected.runtime.recent.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
