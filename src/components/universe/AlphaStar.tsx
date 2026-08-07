"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useUniverse } from "@/components/universe/UniverseProvider";

/** Clean Alpha Star — no rectangular walls or heavy halos. */
export function AlphaStar({
  size = 88,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const { agentStatus, voiceLevel, starReply } = useUniverse();
  const reduce = useReducedMotion();
  const active =
    agentStatus === "thinking" ||
    agentStatus === "speaking" ||
    agentStatus === "listening";
  const pulse = reduce
    ? 1
    : active
      ? 1.04 + voiceLevel * 0.08
      : 1;

  return (
    <div
      className={`relative flex flex-col items-center ${className}`}
      style={{ width: size * 1.5 }}
    >
      <motion.div
        animate={
          reduce
            ? { scale: 1 }
            : {
                scale: pulse,
                y: active ? [0, -2, 0] : [0, -3, 0],
              }
        }
        transition={
          reduce
            ? { duration: 0.2 }
            : {
                scale: { duration: 0.25 },
                y: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
              }
        }
        className="relative"
        style={{ width: size, height: size }}
      >
        {!reduce ? (
          <motion.span
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: size * 1.55,
              height: size * 1.55,
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)",
            }}
            animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.06, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #fff8e7 0%, #fbbf24 42%, #d97706 100%)",
            boxShadow: `0 0 ${18 + voiceLevel * 24}px rgba(251,191,36,0.4)`,
          }}
        />
      </motion.div>
      <p className="mt-2.5 text-center text-[10px] font-semibold tracking-wide text-amber-100/90">
        Alpha Star
      </p>
      <p className="text-center text-[10px] text-[var(--color-muted)]">
        {agentStatus === "idle" ? "Live" : agentStatus}
      </p>
      {starReply ? (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-1/2 top-full z-30 mt-2 hidden w-[min(240px,60vw)] -translate-x-1/2 text-center text-[11px] leading-relaxed text-[var(--color-chrome)] sm:block"
        >
          {starReply}
        </motion.p>
      ) : null}
    </div>
  );
}
