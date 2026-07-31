"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { PlanetConfig } from "@/config/planets.config";
import { MOCK_ACTIVITY, relativeTime } from "@/lib/universe/types";
import { useUniverse } from "@/components/universe/UniverseProvider";

export function PlanetModuleShell({
  planet,
  metrics,
  primaryAction,
  children,
}: {
  planet: PlanetConfig;
  metrics?: Array<{ label: string; value: string }>;
  primaryAction?: { label: string; href?: string; onClick?: () => void };
  children?: ReactNode;
}) {
  const router = useRouter();
  const { setActivePlanetId, resetCamera } = useUniverse();
  const events = MOCK_ACTIVITY.filter((e) => e.planetId === planet.id).slice(
    0,
    5
  );

  useEffect(() => {
    setActivePlanetId(planet.id);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        resetCamera();
        router.push("/universe");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [planet.id, resetCamera, router, setActivePlanetId]);

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto"
      style={{
        background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${planet.theme.glow}, transparent 55%)`,
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Link
          href="/universe"
          onClick={() => resetCamera()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300 hover:text-sky-300"
        >
          <ArrowLeft size={14} /> Galaxy
        </Link>
        <div
          className="h-3 w-3 rounded-full"
          style={{ background: planet.theme.primary, boxShadow: `0 0 12px ${planet.theme.glow}` }}
        />
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{planet.name}</h2>
          <p className="text-[11px] text-slate-500">{planet.subtitle}</p>
        </div>
      </div>

      {metrics?.length ? (
        <div className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-white/8 bg-black/30 p-3"
            >
              <p className="text-[10px] text-slate-500">{m.label}</p>
              <p className="mt-1 font-mono text-lg text-slate-50">{m.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex-1 px-4 pb-4">
        {children ?? (
          <div className="rounded-2xl border border-white/8 bg-black/25 p-6 text-center text-sm text-slate-400">
            {planet.enabled
              ? "Module online — Ask Alpha or open the external product link from the sidebar."
              : "Coming online — planet disabled in planets.config until tools/env exist."}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-white/8 bg-black/25 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Recent activity
          </p>
          <ul className="mt-2 space-y-2">
            {(events.length ? events : MOCK_ACTIVITY.slice(0, 3)).map((ev) => (
              <li key={ev.id} className="text-[12px]">
                <span className="font-medium text-slate-200">{ev.title}</span>
                <span className="text-slate-500"> · {ev.detail}</span>
                <span className="ml-2 text-[10px] text-slate-600">
                  {relativeTime(ev.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {primaryAction ? (
          primaryAction.href ? (
            <Link
              href={primaryAction.href}
              className="mt-4 flex w-full items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-500/15 py-3 text-sm font-semibold text-sky-200"
              style={{ borderColor: `${planet.theme.primary}66` }}
            >
              {primaryAction.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="mt-4 w-full rounded-2xl border py-3 text-sm font-semibold text-sky-200"
              style={{
                borderColor: `${planet.theme.primary}66`,
                background: planet.theme.glow,
              }}
            >
              {primaryAction.label}
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
