"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Map as MapIcon, RotateCcw } from "lucide-react";
import { PLANETS, type PlanetConfig } from "@/config/planets.config";
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
  compact,
  onSelect,
}: {
  planet: PlanetConfig;
  left: string;
  top: string;
  beamed?: boolean;
  compact?: boolean;
  onSelect: (p: PlanetConfig) => void;
}) {
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  const dim = planet.enabled ? 1 : 0.38;

  return (
    <button
      type="button"
      className="absolute z-[8] -translate-x-1/2 -translate-y-1/2 touch-manipulation text-center outline-none"
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
          scale: reduce ? 1 : hover || beamed ? 1.12 : 1,
          boxShadow:
            hover || beamed
              ? `0 0 28px ${planet.theme.glow}`
              : `0 0 14px ${planet.theme.glow}`,
        }}
        className={`relative mx-auto rounded-full ${
          compact ? "h-9 w-9" : "h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14"
        }`}
        style={{
          background: `radial-gradient(circle at 32% 28%, #fff 0%, ${planet.theme.primary} 42%, #020617 100%)`,
          border: beamed
            ? `2px solid ${planet.theme.primary}`
            : `1px solid ${planet.theme.primary}66`,
        }}
      />
      <div className="mt-1 max-w-[5.5rem] sm:max-w-[7rem]">
        <p
          className={`truncate text-[9px] font-semibold sm:text-[11px] ${
            hover ? "text-white" : "text-slate-200"
          }`}
        >
          {planet.name}
        </p>
        {!compact ? (
          <p className="hidden truncate text-[8px] text-slate-500 sm:block">
            {planet.subtitle}
          </p>
        ) : null}
      </div>
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
    label: overviewData?.health.label ?? "Loading…",
  };
  const reduce = useReducedMotion();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const layout = useMemo(() => {
    // Mobile: tighter orbit, prefer enabled planets (still show all, denser)
    const rxScale = mobile ? 32 : 38;
    const ryScale = mobile ? 24 : 28;
    return PLANETS.map((p) => {
      const rad = (p.orbit.angleDeg * Math.PI) / 180;
      const rx = rxScale * Math.min(p.orbit.radius, mobile ? 1.35 : 1.55);
      const ry = ryScale * Math.min(p.orbit.radius, mobile ? 1.35 : 1.55);
      return {
        planet: p,
        x: 50 + Math.cos(rad) * rx,
        y: 50 + Math.sin(rad) * ry,
      };
    });
  }, [mobile]);

  const byId = useMemo(() => {
    const m = new Map<string, { x: number; y: number; enabled: boolean }>();
    for (const row of layout) {
      m.set(row.planet.id, {
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

  const zoom = Math.min(camera.zoom, mobile ? 1 : 1.15);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="absolute right-2 top-2 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0a1220]/85 px-2 py-1.5 backdrop-blur-xl sm:right-4 sm:top-4 sm:px-3 sm:py-2">
        <div className="relative">
          <ProgressRing percent={health.percent} size={36} />
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-sky-200">
            {health.percent.toFixed(0)}%
          </span>
        </div>
        <p className="max-w-[7rem] truncate text-[10px] text-slate-300 sm:max-w-none sm:text-xs">
          {health.label}
        </p>
      </div>

      <div className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-2 pt-12 sm:px-4 sm:pt-14">
        <div
          className="relative mx-auto w-full flex-1 overflow-hidden rounded-3xl border border-white/5 bg-black/20"
          style={{
            minHeight: mobile ? 280 : 340,
            maxHeight: mobile ? "min(42vh, 360px)" : "min(52vh, 520px)",
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            transition: reduce ? "none" : "transform 0.35s ease",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.45), transparent), radial-gradient(1px 1px at 80% 30%, rgba(255,255,255,0.3), transparent), radial-gradient(1.5px 1.5px at 40% 70%, rgba(125,211,252,0.35), transparent)",
            }}
          />

          {/* Constellation connections */}
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
                <line
                  key={`${a}-${b}`}
                  x1={`${A.x}%`}
                  y1={`${A.y}%`}
                  x2={`${B.x}%`}
                  y2={`${B.y}%`}
                  stroke="rgba(167,139,250,0.35)"
                  strokeWidth={1}
                  strokeDasharray="3 5"
                />
              );
            })}
            {beamTarget ? (
              <line
                x1="50%"
                y1="50%"
                x2={`${beamTarget.x}%`}
                y2={`${beamTarget.y}%`}
                stroke="rgba(251,191,36,0.75)"
                strokeWidth={2}
                strokeDasharray="5 4"
              >
                {!reduce ? (
                  <animate
                    attributeName="stroke-opacity"
                    values="0.3;1;0.3"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                ) : null}
              </line>
            ) : null}
          </svg>

          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-[120px] w-[120px] items-center justify-center sm:h-[160px] sm:w-[160px]">
              <AgentSatellites size={mobile ? 110 : 150} />
              <AlphaStar size={mobile ? 48 : 56} className="relative z-[1]" />
            </div>
          </div>

          {layout.map(({ planet, x, y }) => (
            <PlanetOrb
              key={planet.id}
              planet={planet}
              left={`${x}%`}
              top={`${y}%`}
              beamed={beamPlanetId === planet.id}
              compact={mobile}
              onSelect={openPlanet}
            />
          ))}
        </div>

        {/* Mobile quick links for live planets */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {PLANETS.filter((p) => p.enabled).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => openPlanet(p)}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-slate-200"
              style={{ borderColor: `${p.theme.primary}55` }}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="mt-3 shrink-0">
          <SkillsPanel compact={mobile} />
        </div>
      </div>

      <div className="relative z-20 mt-auto flex shrink-0 flex-col items-center gap-1.5 px-2 pb-2 pt-2 sm:px-3">
        <CommandBar />
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={() => resetCamera()}
            className="inline-flex touch-manipulation items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 hover:text-sky-300"
          >
            <RotateCcw size={12} /> Reset
          </button>
          <button
            type="button"
            className="inline-flex touch-manipulation items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 hover:text-sky-300"
            onClick={() => resetCamera()}
          >
            <MapIcon size={12} /> Star Map
          </button>
        </div>
      </div>
    </div>
  );
}
