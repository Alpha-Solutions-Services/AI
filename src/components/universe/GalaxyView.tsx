"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, RotateCcw } from "lucide-react";
import { PLANETS, getEnabledPlanets, type PlanetConfig } from "@/config/planets.config";
import { SKILL_CONSTELLATION } from "@/config/alpha-skills.config";
import { AlphaStar } from "@/components/universe/AlphaStar";
import { AgentSatellites } from "@/components/universe/AgentSatellites";
import { CommandBar } from "@/components/universe/CommandBar";
import { SkillsPanel } from "@/components/universe/SkillsPanel";
import { ProgressRing } from "@/components/universe/UniverseCharts";
import { useUniverse } from "@/components/universe/UniverseProvider";
import { useUniverseOverview } from "@/components/universe/UniverseRightPanel";

function PlanetOrb({
  planet,
  left,
  top,
  beamed,
  onSelect,
}: {
  planet: PlanetConfig;
  left: string;
  top: string;
  beamed?: boolean;
  onSelect: (p: PlanetConfig) => void;
}) {
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  const dim = planet.enabled ? 1 : 0.4;

  return (
    <button
      type="button"
      className="absolute z-[8] -translate-x-1/2 -translate-y-1/2 touch-manipulation text-center outline-none"
      style={{ left, top, opacity: dim }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect(planet)}
      aria-label={`${planet.name}: ${planet.subtitle}`}
    >
      <motion.div
        animate={{
          scale: reduce ? 1 : hover || beamed ? 1.12 : 1,
          boxShadow:
            hover || beamed
              ? `0 0 28px ${planet.theme.glow}`
              : `0 0 14px ${planet.theme.glow}`,
        }}
        className="relative mx-auto h-11 w-11 rounded-full lg:h-14 lg:w-14"
        style={{
          background: `radial-gradient(circle at 32% 28%, #fff 0%, ${planet.theme.primary} 42%, #020617 100%)`,
          border: beamed
            ? `2px solid ${planet.theme.primary}`
            : `1px solid ${planet.theme.primary}66`,
        }}
      />
      <p className="mt-1 max-w-[6.5rem] truncate text-[10px] font-semibold text-slate-200 lg:text-[11px]">
        {planet.name}
      </p>
    </button>
  );
}

/** Mobile / tablet: readable connected module list (no crushed orbit). */
function MobileGalaxy({
  onOpen,
}: {
  onOpen: (p: PlanetConfig) => void;
}) {
  const enabled = getEnabledPlanets();
  const soon = PLANETS.filter((p) => !p.enabled).slice(0, 4);

  return (
    <div className="space-y-3 px-3 pb-2 pt-2 lg:hidden">
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-500/5 px-3 py-4">
        <div
          className="h-14 w-14 shrink-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #fff8e7 0%, #fbbf24 40%, #b45309 100%)",
            boxShadow: "0 0 28px rgba(251,191,36,0.45)",
          }}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-100">Alpha Star</p>
          <p className="text-[11px] text-slate-400">
            Connected to live modules below
          </p>
        </div>
      </div>

      <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/90">
        Live modules
      </p>
      <ul className="space-y-2">
        {enabled.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpen(p)}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left touch-manipulation active:bg-white/[0.07]"
              style={{ borderColor: `${p.theme.primary}44` }}
            >
              <span
                className="h-10 w-10 shrink-0 rounded-full"
                style={{
                  background: `radial-gradient(circle at 32% 28%, #fff, ${p.theme.primary} 50%, #020617)`,
                  boxShadow: `0 0 16px ${p.theme.glow}`,
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-100">
                  {p.name}
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {p.subtitle}
                </span>
                {i < enabled.length - 1 ? (
                  <span className="mt-1 block text-[9px] text-violet-300/80">
                    ↕ skill link · connected
                  </span>
                ) : null}
              </span>
              <ChevronRight size={16} className="shrink-0 text-slate-500" />
            </button>
          </li>
        ))}
      </ul>

      {soon.length ? (
        <>
          <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Coming soon
          </p>
          <div className="flex flex-wrap gap-2">
            {soon.map((p) => (
              <span
                key={p.id}
                className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-500"
              >
                {p.name}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function GalaxyView() {
  const router = useRouter();
  const {
    setActivePlanetId,
    setCamera,
    resetCamera,
    beamPlanetId,
    setBeamPlanetId,
  } = useUniverse();
  const { data: overviewData } = useUniverseOverview();
  const health = {
    percent: overviewData?.health.percent ?? 0,
    label: overviewData?.health.label ?? "Loading…",
  };
  const reduce = useReducedMotion();

  const layout = useMemo(() => {
    return PLANETS.map((p) => {
      const rad = (p.orbit.angleDeg * Math.PI) / 180;
      const rx = 36 * p.orbit.radius;
      const ry = 26 * p.orbit.radius;
      return {
        planet: p,
        x: 50 + Math.cos(rad) * rx,
        y: 50 + Math.sin(rad) * ry,
      };
    });
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, { x: number; y: number; enabled: boolean }>();
    for (const row of layout) {
      m.set(String(row.planet.id), {
        x: row.x,
        y: row.y,
        enabled: row.planet.enabled,
      });
    }
    return m;
  }, [layout]);

  const beamTarget = useMemo(() => {
    if (!beamPlanetId) return null;
    return layout.find((l) => l.planet.id === beamPlanetId) ?? null;
  }, [beamPlanetId, layout]);

  useEffect(() => {
    if (!beamPlanetId) return;
    const t = window.setTimeout(() => setBeamPlanetId(null), 4200);
    return () => window.clearTimeout(t);
  }, [beamPlanetId, setBeamPlanetId]);

  function openPlanet(p: PlanetConfig) {
    setActivePlanetId(p.id);
    setCamera({ focusPlanetId: p.id, zoom: 1 });
    setBeamPlanetId(p.id);
    router.push(p.route);
  }

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden">
      <div className="absolute right-2 top-2 z-20 flex max-w-[55%] items-center gap-2 rounded-2xl border border-white/10 bg-[#0a1220]/90 px-2 py-1.5 backdrop-blur-xl sm:right-4 sm:top-3">
        <div className="relative shrink-0">
          <ProgressRing percent={health.percent} size={34} />
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-sky-200">
            {health.percent.toFixed(0)}%
          </span>
        </div>
        <p className="truncate text-[10px] text-slate-300 sm:text-xs">
          {health.label}
        </p>
      </div>

      {/* Mobile list */}
      <div className="min-h-0 flex-1 overflow-y-auto pt-12 lg:hidden">
        <MobileGalaxy onOpen={openPlanet} />
        <div className="px-3 pb-3">
          <SkillsPanel compact />
        </div>
      </div>

      {/* Desktop orbit */}
      <div className="relative mx-auto hidden min-h-0 w-full max-w-5xl flex-1 flex-col px-4 pt-14 lg:flex">
        <div
          className="relative mx-auto w-full flex-1 overflow-hidden rounded-3xl border border-white/5 bg-black/25"
          style={{ minHeight: 380, maxHeight: "min(54vh, 540px)" }}
        >
          <svg
            className="pointer-events-none absolute inset-0 z-[4] h-full w-full"
            aria-hidden
          >
            {layout
              .filter((l) => l.planet.enabled)
              .map(({ planet, x, y }) => (
                <line
                  key={`spoke-${planet.id}`}
                  x1="50%"
                  y1="50%"
                  x2={`${x}%`}
                  y2={`${y}%`}
                  stroke={planet.theme.primary}
                  strokeOpacity={0.45}
                  strokeWidth={1.75}
                />
              ))}
            {SKILL_CONSTELLATION.map(([a, b]) => {
              const A = byId.get(a);
              const B = byId.get(b);
              if (!A || !B) return null;
              if (!A.enabled && !B.enabled) return null;
              return (
                <line
                  key={`${a}-${b}`}
                  x1={`${A.x}%`}
                  y1={`${A.y}%`}
                  x2={`${B.x}%`}
                  y2={`${B.y}%`}
                  stroke="rgba(167,139,250,0.55)"
                  strokeWidth={1.5}
                  strokeDasharray="4 6"
                />
              );
            })}
            {beamTarget ? (
              <line
                x1="50%"
                y1="50%"
                x2={`${beamTarget.x}%`}
                y2={`${beamTarget.y}%`}
                stroke="rgba(251,191,36,0.9)"
                strokeWidth={2.5}
                strokeDasharray="6 4"
              >
                {!reduce ? (
                  <animate
                    attributeName="stroke-opacity"
                    values="0.35;1;0.35"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                ) : null}
              </line>
            ) : null}
          </svg>

          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-[160px] w-[160px] items-center justify-center">
              <AgentSatellites size={150} />
              <AlphaStar size={56} className="relative z-[1]" />
            </div>
          </div>

          {layout.map(({ planet, x, y }) => (
            <PlanetOrb
              key={planet.id}
              planet={planet}
              left={`${x}%`}
              top={`${y}%`}
              beamed={beamPlanetId === planet.id}
              onSelect={openPlanet}
            />
          ))}
        </div>

        <div className="mt-3 shrink-0">
          <SkillsPanel />
        </div>
      </div>

      <div className="relative z-20 mt-auto flex shrink-0 flex-col items-center gap-1.5 border-t border-white/5 bg-[#030712]/80 px-2 py-2 backdrop-blur-xl sm:px-3">
        <CommandBar />
        <button
          type="button"
          onClick={() => resetCamera()}
          className="hidden touch-manipulation items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 hover:text-sky-300 lg:inline-flex"
        >
          <RotateCcw size={12} /> Reset view
        </button>
      </div>
    </div>
  );
}
