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
  index,
  onSelect,
}: {
  planet: PlanetConfig;
  left: string;
  top: string;
  beamed?: boolean;
  index: number;
  onSelect: (p: PlanetConfig) => void;
}) {
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  const dim = planet.enabled ? 1 : 0.38;

  return (
    <motion.button
      type="button"
      className="absolute z-[8] -translate-x-1/2 -translate-y-1/2 touch-manipulation text-center outline-none"
      style={{ left, top, opacity: dim }}
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={
        reduce
          ? { opacity: dim, scale: 1 }
          : {
              opacity: dim,
              scale: hover || beamed ? 1.1 : 1,
              y: [0, index % 2 === 0 ? -4 : 3, 0],
            }
      }
      transition={
        reduce
          ? { duration: 0.2 }
          : {
              opacity: { duration: 0.35, delay: index * 0.04 },
              scale: { duration: 0.2 },
              y: {
                duration: 4 + (index % 3),
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.15,
              },
            }
      }
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect(planet)}
      aria-label={`${planet.name}: ${planet.subtitle}`}
    >
      <div
        className="relative mx-auto h-11 w-11 rounded-full lg:h-12 lg:w-12"
        style={{
          background: `radial-gradient(circle at 32% 28%, #fff 0%, ${planet.theme.primary} 48%, #020617 100%)`,
          boxShadow:
            hover || beamed
              ? `0 0 20px ${planet.theme.glow}`
              : `0 0 10px ${planet.theme.glow}`,
          outline: beamed ? `2px solid ${planet.theme.primary}` : "none",
          outlineOffset: 2,
        }}
      />
      <p className="mt-1.5 max-w-[6.5rem] truncate text-[10px] font-medium text-[var(--color-chrome)] lg:text-[11px]">
        {planet.name}
      </p>
    </motion.button>
  );
}

function MobileGalaxy({ onOpen }: { onOpen: (p: PlanetConfig) => void }) {
  const enabled = getEnabledPlanets();
  const soon = PLANETS.filter((p) => !p.enabled).slice(0, 4);

  return (
    <div className="space-y-3 px-3 pb-2 pt-2 lg:hidden">
      <div className="flex items-center justify-center gap-3 px-2 py-3">
        <div
          className="h-12 w-12 shrink-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #fff8e7 0%, #fbbf24 45%, #d97706 100%)",
            boxShadow: "0 0 20px rgba(251,191,36,0.35)",
          }}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Alpha Star</p>
          <p className="text-[11px] text-[var(--color-muted)]">
            Open a live module
          </p>
        </div>
      </div>

      <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        Live modules
      </p>
      <ul className="space-y-2">
        {enabled.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpen(p)}
              className="flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-left active:bg-[var(--color-surface-2)]"
            >
              <span
                className="h-9 w-9 shrink-0 rounded-full"
                style={{
                  background: `radial-gradient(circle at 32% 28%, #fff, ${p.theme.primary} 55%, #020617)`,
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{p.name}</span>
                <span className="block truncate text-[11px] text-[var(--color-muted)]">
                  {p.subtitle}
                </span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-[var(--color-muted)]" />
            </button>
          </li>
        ))}
      </ul>

      {soon.length ? (
        <>
          <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Coming soon
          </p>
          <div className="flex flex-wrap gap-2">
            {soon.map((p) => (
              <span
                key={p.id}
                className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] text-[var(--color-muted)]"
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
      <div className="absolute right-2 top-2 z-20 flex max-w-[55%] items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 sm:right-4 sm:top-3">
        <div className="relative shrink-0">
          <ProgressRing percent={health.percent} size={34} />
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-[var(--color-accent-2)]">
            {health.percent.toFixed(0)}%
          </span>
        </div>
        <p className="truncate text-[10px] text-[var(--color-chrome)] sm:text-xs">
          {health.label}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-12 lg:hidden">
        <MobileGalaxy onOpen={openPlanet} />
        <div className="px-3 pb-3">
          <SkillsPanel compact />
        </div>
      </div>

      {/* Desktop orbit — open canvas, no bordered “wall” frame */}
      <div className="relative mx-auto hidden min-h-0 w-full max-w-5xl flex-1 flex-col px-2 pt-12 lg:flex">
        <div
          className="relative mx-auto w-full flex-1 overflow-visible"
          style={{ minHeight: 400, maxHeight: "min(58vh, 560px)" }}
        >
          <svg
            className="pointer-events-none absolute inset-0 z-[4] h-full w-full overflow-visible"
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
                  strokeOpacity={0.28}
                  strokeWidth={1.25}
                />
              ))}
            {SKILL_CONSTELLATION.map(([a, b]) => {
              const A = byId.get(a);
              const B = byId.get(b);
              if (!A || !B) return null;
              if (!A.enabled && !B.enabled) return null;
              return (
                <motion.line
                  key={`${a}-${b}`}
                  x1={`${A.x}%`}
                  y1={`${A.y}%`}
                  x2={`${B.x}%`}
                  y2={`${B.y}%`}
                  stroke="rgba(148,163,184,0.45)"
                  strokeWidth={1.25}
                  strokeDasharray="5 7"
                  initial={false}
                  animate={
                    reduce
                      ? undefined
                      : { strokeDashoffset: [0, -24] }
                  }
                  transition={
                    reduce
                      ? undefined
                      : { duration: 6, repeat: Infinity, ease: "linear" }
                  }
                />
              );
            })}
            {beamTarget ? (
              <line
                x1="50%"
                y1="50%"
                x2={`${beamTarget.x}%`}
                y2={`${beamTarget.y}%`}
                stroke="rgba(251,191,36,0.85)"
                strokeWidth={2}
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
            <div className="relative flex h-[140px] w-[140px] items-center justify-center">
              <AgentSatellites size={140} />
              <AlphaStar size={52} className="relative z-[1]" />
            </div>
          </div>

          {layout.map(({ planet, x, y }, i) => (
            <PlanetOrb
              key={planet.id}
              planet={planet}
              left={`${x}%`}
              top={`${y}%`}
              index={i}
              beamed={beamPlanetId === planet.id}
              onSelect={openPlanet}
            />
          ))}
        </div>

        <div className="mt-2 shrink-0 px-2">
          <SkillsPanel />
        </div>
      </div>

      <div className="relative z-20 mt-auto flex shrink-0 flex-col items-center gap-1.5 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 sm:px-3">
        <CommandBar />
        <button
          type="button"
          onClick={() => resetCamera()}
          className="hidden items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1 text-[10px] text-[var(--color-muted)] hover:text-[var(--color-accent-2)] lg:inline-flex"
        >
          <RotateCcw size={12} /> Reset view
        </button>
      </div>
    </div>
  );
}
