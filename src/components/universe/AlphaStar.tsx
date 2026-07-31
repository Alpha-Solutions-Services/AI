"use client";

import { motion } from "framer-motion";
import { useUniverse } from "@/components/universe/UniverseProvider";

/** Isolated so Stage 4 can drive glow/pulse without rewriting the galaxy. */
export function AlphaStar({
  size = 88,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const { agentStatus, voiceLevel, starReply } = useUniverse();
  const pulse =
    agentStatus === "thinking" || agentStatus === "speaking"
      ? 1.08 + voiceLevel * 0.12
      : agentStatus === "listening"
        ? 1.04 + voiceLevel * 0.2
        : 1 + voiceLevel * 0.06;

  return (
    <div
      className={`relative flex flex-col items-center ${className}`}
      style={{ width: size * 1.6 }}
    >
      <motion.div
        animate={{ scale: pulse }}
        transition={{ duration: 0.2 }}
        className="relative"
        style={{ width: size, height: size }}
      >
        {[1.45, 1.85, 2.25].map((mul, i) => (
          <span
            key={mul}
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-amber-300/20 motion-reduce:animate-none"
            style={{
              width: size * mul,
              height: size * mul,
              transform: "translate(-50%, -50%)",
              opacity: 0.35 - i * 0.08 + voiceLevel * 0.15,
            }}
          />
        ))}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #fff8e7 0%, #fbbf24 35%, #f59e0b 60%, #b45309 100%)",
            boxShadow: `0 0 ${40 + voiceLevel * 40}px rgba(251,191,36,${0.55 + voiceLevel * 0.25}), 0 0 80px rgba(251,191,36,0.25), inset 0 0 20px rgba(255,255,255,0.35)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-[-40%] opacity-40 motion-reduce:hidden"
          style={{
            background:
              "conic-gradient(from 0deg, transparent, rgba(251,191,36,0.25), transparent 40%, transparent 60%, rgba(255,255,255,0.15), transparent)",
            animation: "universe-spin 18s linear infinite",
          }}
        />
      </motion.div>
      <p className="mt-3 text-center text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-200/90">
        Alpha Star
      </p>
      <p className="text-center text-[8px] uppercase tracking-[0.16em] text-slate-500">
        {agentStatus === "idle" ? "AI Consciousness" : agentStatus}
      </p>
      {starReply ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-1/2 top-full z-30 mt-1 hidden w-[min(260px,68vw)] -translate-x-1/2 rounded-2xl border border-amber-300/25 bg-[#0a1220]/92 px-3 py-2 text-left shadow-[0_0_30px_rgba(251,191,36,0.15)] backdrop-blur-xl sm:block"
        >
          <p className="line-clamp-4 text-[11px] leading-relaxed text-slate-200">
            {starReply}
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}
