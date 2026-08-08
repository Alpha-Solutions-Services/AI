"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, RotateCcw } from "lucide-react";
import { PLANETS, getEnabledPlanets, type PlanetConfig } from "@/config/planets.config";
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
  const lit = hover || beamed;

  return (
    <motion.button
      type="button"
      className="absolute z-[8] -translate-x-1/2 -translate-y-1/2 touch-manipulation text-center outline-none [perspective:600px]"
      style={{ left, top, opacity: dim }}
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={
        reduce
          ? { opacity: dim, scale: 1 }
          : {
              opacity: dim,
              scale: lit ? 1.12 : 1,
            }
      }
      transition={
        reduce
          ? { duration: 0.2 }
          : {
              opacity: { duration: 0.35, delay: index * 0.04 },
              scale: { duration: 0.22 },
            }
      }
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect(planet)}
      aria-label={`${planet.name}: ${planet.subtitle}`}
    >
      {/* Ground shadow for 3D depth */}
      <span
        aria-hidden
        className="absolute left-1/2 top-[2.65rem] h-2 w-8 -translate-x-1/2 rounded-[100%] bg-black/50 blur-[3px] lg:top-[3.1rem] lg:w-9"
      />
      <div
        className="relative mx-auto h-12 w-12 lg:h-[3.25rem] lg:w-[3.25rem]"
        style={{
          transform: lit ? "rotateX(8deg) rotateY(-6deg)" : "rotateX(6deg)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Soft atmosphere */}
        <span
          aria-hidden
          className="absolute -inset-1 rounded-full opacity-70"
          style={{
            background: `radial-gradient(circle, ${planet.theme.glow} 0%, transparent 70%)`,
            filter: "blur(2px)",
          }}
        />
        {/* Sphere body */}
        <span
          className="absolute inset-0 overflow-hidden rounded-full"
          style={{
            background: `
              radial-gradient(circle at 30% 26%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 14%, transparent 36%),
              radial-gradient(circle at 48% 48%, ${planet.theme.primary} 0%, ${planet.theme.primary} 42%, #0a1220 78%, #020617 100%)
            `,
            boxShadow: lit
              ? `inset -6px -8px 14px rgba(0,0,0,0.55), inset 4px 4px 10px rgba(255,255,255,0.25), 0 0 26px ${planet.theme.glow}`
              : `inset -5px -7px 12px rgba(0,0,0,0.5), inset 3px 3px 8px rgba(255,255,255,0.18), 0 0 14px ${planet.theme.glow}`,
          }}
        />
        {/* Specular glint */}
        <span
          aria-hidden
          className="absolute left-[18%] top-[16%] h-[28%] w-[22%] rounded-full bg-white/50 blur-[1px]"
        />
        {/* Terminator rim */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: `inset -10px -2px 12px rgba(0,0,0,0.35), 0 0 0 1px ${planet.theme.primary}33`,
          }}
        />
        {beamed ? (
          <span
            aria-hidden
            className="absolute -inset-1.5 rounded-full border border-amber-300/70"
          />
        ) : null}
      </div>
      <p className="relative z-[1] mt-2 max-w-[6.5rem] truncate text-[10px] font-medium text-[var(--color-chrome)] drop-shadow lg:text-[11px]">
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
                className="relative h-10 w-10 shrink-0"
              >
                <span
                  className="absolute inset-0 overflow-hidden rounded-full"
                  style={{
                    background: `
                      radial-gradient(circle at 30% 26%, rgba(255,255,255,0.9) 0%, transparent 34%),
                      radial-gradient(circle at 48% 48%, ${p.theme.primary} 0%, #0a1220 78%, #020617 100%)
                    `,
                    boxShadow: `inset -4px -5px 10px rgba(0,0,0,0.45), 0 0 12px ${p.theme.glow}`,
                  }}
                />
              </span>
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

  // Single source of truth: measure the orbit stage in pixels, then place BOTH
  // the SVG links and the HTML planet orbs from the same numbers. This makes
  // link/planet misalignment impossible regardless of container aspect ratio.
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () =>
      setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const center = useMemo(
    () => ({ x: stage.w / 2, y: stage.h / 2 }),
    [stage.w, stage.h]
  );

  const nodes = useMemo(() => {
    const cx = stage.w / 2;
    const cy = stage.h / 2;
    // Leave margin so orbs + labels never clip the stage edges.
    const rx = (stage.w / 2) * 0.82;
    const ry = (stage.h / 2) * 0.82;
    return PLANETS.map((p) => {
      const rad = (p.orbit.angleDeg * Math.PI) / 180;
      // Compress radius variance (1.05–1.55 -> 0.6–0.96) for a tidy ring.
      const rf = 0.6 + (p.orbit.radius - 1.05) * 0.72;
      return {
        planet: p,
        x: cx + Math.cos(rad) * rx * rf,
        y: cy + Math.sin(rad) * ry * rf,
      };
    });
  }, [stage.w, stage.h]);

  const ready = stage.w > 0 && stage.h > 0;

  const beamTarget = useMemo(() => {
    if (!beamPlanetId) return null;
    return nodes.find((n) => n.planet.id === beamPlanetId) ?? null;
  }, [beamPlanetId, nodes]);

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
          ref={stageRef}
          className="relative mx-auto w-full flex-1 overflow-visible"
          style={{ minHeight: 400, maxHeight: "min(58vh, 560px)" }}
        >
          <svg
            className="pointer-events-none absolute inset-0 z-[4] overflow-visible"
            width={stage.w}
            height={stage.h}
            aria-hidden
          >
            <defs>
              <filter
                id="link-glow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter
                id="link-glow-strong"
                x="-60%"
                y="-60%"
                width="220%"
                height="220%"
              >
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Star → planet spokes for EVERY planet, drawn in the SAME pixel
                space as the orbs, so every line ends exactly at its planet. */}
            {ready
              ? nodes.map(({ planet, x, y }) => {
                  const on = planet.enabled;
                  return (
                    <g key={`spoke-${planet.id}`} filter="url(#link-glow)">
                      <line
                        x1={center.x}
                        y1={center.y}
                        x2={x}
                        y2={y}
                        stroke={planet.theme.primary}
                        strokeOpacity={on ? 0.22 : 0.08}
                        strokeWidth={on ? 5 : 3}
                        strokeLinecap="round"
                      />
                      <line
                        x1={center.x}
                        y1={center.y}
                        x2={x}
                        y2={y}
                        stroke={planet.theme.primary}
                        strokeOpacity={on ? 0.8 : 0.28}
                        strokeWidth={on ? 2 : 1.2}
                        strokeLinecap="round"
                      />
                      {on && !reduce ? (
                        <circle
                          cx={center.x}
                          cy={center.y}
                          r={3}
                          fill={planet.theme.primary}
                          opacity={0.95}
                        >
                          <animate
                            attributeName="cx"
                            values={`${center.x};${x}`}
                            dur={`${3.2 + (Math.abs(planet.orbit.angleDeg) % 50) / 25}s`}
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="cy"
                            values={`${center.y};${y}`}
                            dur={`${3.2 + (Math.abs(planet.orbit.angleDeg) % 50) / 25}s`}
                            repeatCount="indefinite"
                          />
                        </circle>
                      ) : null}
                    </g>
                  );
                })
              : null}

            {ready && beamTarget ? (
              <g filter="url(#link-glow-strong)">
                <line
                  x1={center.x}
                  y1={center.y}
                  x2={beamTarget.x}
                  y2={beamTarget.y}
                  stroke="rgba(251,191,36,0.3)"
                  strokeWidth={6}
                  strokeLinecap="round"
                />
                <line
                  x1={center.x}
                  y1={center.y}
                  x2={beamTarget.x}
                  y2={beamTarget.y}
                  stroke="rgba(251,191,36,0.95)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                >
                  {!reduce ? (
                    <animate
                      attributeName="stroke-opacity"
                      values="0.45;1;0.45"
                      dur="0.9s"
                      repeatCount="indefinite"
                    />
                  ) : null}
                </line>
              </g>
            ) : null}
          </svg>

          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-[140px] w-[140px] items-center justify-center">
              <AgentSatellites size={140} />
              <AlphaStar size={52} className="relative z-[1]" />
            </div>
          </div>

          {ready
            ? nodes.map(({ planet, x, y }, i) => (
            <PlanetOrb
              key={planet.id}
              planet={planet}
              left={`${x}px`}
              top={`${y}px`}
              index={i}
              beamed={beamPlanetId === planet.id}
              onSelect={openPlanet}
            />
              ))
            : null}
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
