"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Map, RotateCcw, TrendingUp } from "lucide-react";
import { PLANETS, type PlanetConfig } from "@/config/planets.config";
import { AlphaStar } from "@/components/universe/AlphaStar";
import { AgentSatellites } from "@/components/universe/AgentSatellites";
import { CommandBar } from "@/components/universe/CommandBar";
import { ProgressRing } from "@/components/universe/UniverseCharts";
import { useUniverse } from "@/components/universe/UniverseProvider";
import { useUniverseOverview } from "@/components/universe/UniverseRightPanel";

/**
 * 2.5D orbital diagram (CSS + Framer Motion).
 * R3F is installed for optional upgrade; this hits label legibility + 60fps first.
 */
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
  const dim = planet.enabled ? 1 : 0.45;

  return (
    <button
      type="button"
      className="absolute -translate-x-1/2 -translate-y-1/2 touch-manipulation text-center outline-none"
      style={{ left, top, opacity: dim }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onClick={() => onSelect(planet)}
      aria-label={`${planet.name}: ${planet.subtitle}`}
    >
      <motion.div
        animate={{
          scale: reduce ? 1 : hover || beamed ? 1.15 : 1,
          boxShadow:
            hover || beamed
              ? `0 0 28px ${planet.theme.glow}`
              : `0 0 14px ${planet.theme.glow}`,
        }}
        className="relative mx-auto h-11 w-11 rounded-full sm:h-12 sm:w-12 md:h-14 md:w-14"
        style={{
          background: `radial-gradient(circle at 32% 28%, #fff 0%, ${planet.theme.primary} 42%, #020617 100%)`,
          border: beamed
            ? `2px solid ${planet.theme.primary}`
            : `1px solid ${planet.theme.primary}66`,
        }}
      >
        {planet.theme.rings ? (
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[170%] -translate-x-1/2 -translate-y-1/2 rounded-[100%] border border-white/25"
            style={{ transform: "translate(-50%, -50%) rotateX(68deg)" }}
          />
        ) : null}
      </motion.div>
      <motion.div
        animate={{ opacity: hover ? 1 : 0.75, y: hover && !reduce ? -2 : 0 }}
        className="mt-1.5 max-w-[7.5rem]"
      >
        <p
          className={`text-[10px] font-semibold sm:text-[11px] ${
            hover ? "text-white" : "text-slate-200"
          }`}
        >
          {planet.name}
        </p>
        <p
          className={`hidden text-[8px] leading-tight sm:block sm:text-[9px] ${
            hover ? "text-slate-300" : "text-slate-500"
          }`}
        >
          {planet.subtitle}
        </p>
        {!planet.enabled ? (
          <p className="text-[8px] text-slate-600 opacity-70">Soon</p>
        ) : null}
      </motion.div>
    </button>
  );
}

export function GalaxyView() {
  const router = useRouter();
  const {
    setActivePlanetId,
    setCamera,
    resetCamera,
    camera,
    beamPlanetId,
    setBeamPlanetId,
  } = useUniverse();
  const { data: overviewData } = useUniverseOverview();
  const health = {
    percent: overviewData?.health.percent ?? 0,
    activeProcesses: overviewData?.health.activeProcesses ?? 0,
    label: overviewData?.health.label ?? "Loading…",
  };
  const reduce = useReducedMotion();

  const layout = useMemo(() => {
    return PLANETS.map((p) => {
      const rad = (p.orbit.angleDeg * Math.PI) / 180;
      const rx = 38 * p.orbit.radius;
      const ry = 28 * p.orbit.radius;
      return {
        planet: p,
        x: 50 + Math.cos(rad) * rx,
        y: 50 + Math.sin(rad) * ry,
      };
    });
  }, []);

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
    setCamera({ focusPlanetId: p.id, zoom: 1.15 });
    setBeamPlanetId(p.id);
    router.push(p.route);
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {/* Floating health card — denser on mobile */}
      <div className="absolute right-2 top-2 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0a1220]/80 px-2.5 py-1.5 backdrop-blur-xl sm:right-4 sm:top-4 sm:gap-3 sm:px-3 sm:py-2">
        <div className="relative">
          <ProgressRing percent={health.percent} size={40} />
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-sky-200 sm:text-[9px]">
            {health.percent.toFixed(0)}%
          </span>
        </div>
        <div className="hidden xs:block sm:block">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 sm:text-[10px]">
            Universe Health
          </p>
          <p className="flex items-center gap-1 text-[11px] text-slate-200 sm:text-xs">
            <TrendingUp size={12} className="text-emerald-400" />
            {health.label}
          </p>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-4xl flex-1 px-1 py-4 sm:px-4 sm:py-6">
        <div
          className="relative mx-auto aspect-[4/3] w-full max-h-[min(58vh,560px)] overflow-visible sm:max-h-[min(62vh,560px)]"
          style={{
            transform: `scale(${camera.zoom})`,
            transition: reduce ? "none" : "transform 0.45s ease",
            willChange: "transform",
          }}
        >
          {/* Starfield (sparse) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 80% 30%, rgba(255,255,255,0.35), transparent), radial-gradient(1.5px 1.5px at 40% 70%, rgba(125,211,252,0.4), transparent), radial-gradient(1px 1px at 70% 80%, rgba(255,255,255,0.3), transparent), radial-gradient(1px 1px at 25% 55%, rgba(255,255,255,0.25), transparent)",
            }}
          />
          {/* Nebula wash */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[8%] rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(56,189,248,0.12), transparent 65%)",
            }}
          />

          {/* Orbit guides */}
          {[0.9, 1.15, 1.4].map((r) => (
            <div
              key={r}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-sky-400/10"
              style={{
                width: `${r * 72}%`,
                height: `${r * 52}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}

          {/* Action beam star → planet */}
          {beamTarget ? (
            <svg
              className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
              aria-hidden
            >
              <line
                x1="50%"
                y1="50%"
                x2={`${beamTarget.x}%`}
                y2={`${beamTarget.y}%`}
                stroke="rgba(251,191,36,0.55)"
                strokeWidth="1.5"
                strokeDasharray="4 6"
              >
                {!reduce ? (
                  <animate
                    attributeName="stroke-opacity"
                    values="0.2;0.85;0.2"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                ) : null}
              </line>
            </svg>
          ) : null}

          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-[150px] w-[150px] items-center justify-center sm:h-[170px] sm:w-[170px]">
              <AgentSatellites size={150} />
              <AlphaStar size={56} className="relative z-[1] sm:!w-[auto]" />
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
      </div>

      <div className="relative z-20 mb-1 flex flex-col items-center gap-2 px-2 pb-2 sm:mb-2 sm:px-3">
        <CommandBar />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => resetCamera()}
            className="inline-flex touch-manipulation items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 hover:text-sky-300"
          >
            <RotateCcw size={12} /> Reset View
          </button>
          <button
            type="button"
            className="inline-flex touch-manipulation items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 hover:text-sky-300"
            title="Star map overview"
            onClick={() => resetCamera()}
          >
            <Map size={12} /> Star Map
          </button>
        </div>
      </div>
    </div>
  );
}
