"use client";

import { useEffect, useMemo, useRef } from "react";

type Mode = "idle" | "listening" | "thinking" | "speaking";

type Particle = {
  kind: "letter" | "orbit";
  /** Target on letter A (normalized -1..1 space) */
  tx: number;
  ty: number;
  x: number;
  y: number;
  angle: number;
  orbitR: number;
  speed: number;
  size: number;
  phase: number;
};

/** Sample points that sketch a capital A in unit space. */
function sampleLetterA(count: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const left = (t: number) => ({ x: -0.55 + t * 0.55, y: 0.7 - t * 1.4 });
  const right = (t: number) => ({ x: 0.55 - t * 0.55, y: 0.7 - t * 1.4 });
  const bar = (t: number) => ({ x: -0.28 + t * 0.56, y: 0.08 });

  const nSide = Math.floor(count * 0.4);
  const nBar = count - nSide * 2;
  for (let i = 0; i < nSide; i++) pts.push(left(i / Math.max(1, nSide - 1)));
  for (let i = 0; i < nSide; i++) pts.push(right(i / Math.max(1, nSide - 1)));
  for (let i = 0; i < nBar; i++) pts.push(bar(i / Math.max(1, nBar - 1)));
  return pts;
}

/**
 * Big centered particle “A” — orbit ring + speech/listen reactive motion.
 */
export function SpeakingOrb({
  mode = "idle",
  level = 0,
  className = "",
}: {
  mode?: Mode;
  /** 0..1 audio / speech energy */
  level?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const levelRef = useRef(level);
  const letterPts = useMemo(() => sampleLetterA(72), []);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    let particles: Particle[] = [];
    let w = 0;
    let h = 0;
    let scale = 1;

    const resize = () => {
      const parent = canvas.parentElement;
      const css = Math.min(
        parent?.clientWidth || 320,
        parent?.clientHeight || 320,
        420
      );
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = css;
      h = css;
      canvas.width = css * dpr;
      canvas.height = css * dpr;
      canvas.style.width = `${css}px`;
      canvas.style.height = `${css}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = css * 0.38;

      particles = [
        ...letterPts.map((p, i) => ({
          kind: "letter" as const,
          tx: p.x,
          ty: p.y,
          x: p.x + (Math.random() - 0.5) * 0.2,
          y: p.y + (Math.random() - 0.5) * 0.2,
          angle: 0,
          orbitR: 0,
          speed: 0,
          size: 1.6 + (i % 4) * 0.35,
          phase: Math.random() * Math.PI * 2,
        })),
        ...Array.from({ length: 36 }, (_, i) => {
          const a = (i / 36) * Math.PI * 2;
          return {
            kind: "orbit" as const,
            tx: 0,
            ty: 0,
            x: Math.cos(a),
            y: Math.sin(a),
            angle: a,
            orbitR: 1.15 + (i % 5) * 0.06,
            speed: 0.008 + (i % 6) * 0.0015,
            size: 1.2 + (i % 3) * 0.4,
            phase: Math.random() * Math.PI * 2,
          };
        }),
      ];
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = () => {
      t += 1;
      const modeNow = modeRef.current;
      const lvl = Math.max(0, Math.min(1, levelRef.current));
      const active =
        modeNow === "speaking" ||
        modeNow === "listening" ||
        modeNow === "thinking";
      const energy =
        modeNow === "speaking"
          ? 0.35 + lvl * 0.9
          : modeNow === "listening"
            ? 0.25 + lvl * 0.7
            : modeNow === "thinking"
              ? 0.35 + Math.sin(t * 0.1) * 0.15
              : 0.12;

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;

      // Soft core
      const glowR = scale * (0.55 + energy * 0.25);
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, glowR);
      grad.addColorStop(
        0,
        active ? "rgba(120,210,255,0.55)" : "rgba(56,163,255,0.2)"
      );
      grad.addColorStop(0.5, "rgba(56,163,255,0.12)");
      grad.addColorStop(1, "rgba(5,8,15,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring
      ctx.strokeStyle = active
        ? `rgba(91,200,255,${0.25 + energy * 0.35})`
        : "rgba(56,163,255,0.18)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * (1.22 + energy * 0.08), 0, Math.PI * 2);
      ctx.stroke();

      for (const p of particles) {
        if (p.kind === "orbit") {
          p.angle += p.speed * (active ? 1.6 + energy : 0.4);
          const wobble =
            Math.sin(t * 0.04 + p.phase) * (0.04 + energy * 0.08);
          const r = p.orbitR + wobble;
          p.x = Math.cos(p.angle) * r;
          p.y = Math.sin(p.angle) * r;
        } else {
          // Speech pattern: displace letter particles along local normal / radial burst
          const burst =
            modeNow === "speaking"
              ? Math.sin(t * 0.25 + p.phase * 3) * energy * 0.18
              : modeNow === "listening"
                ? Math.sin(t * 0.2 + p.phase) * energy * 0.1
                : Math.sin(t * 0.03 + p.phase) * 0.02;
          const targetX = p.tx * (1 + burst);
          const targetY = p.ty * (1 + burst * 0.6);
          p.x += (targetX - p.x) * 0.12;
          p.y += (targetY - p.y) * 0.12;
        }

        const px = cx + p.x * scale;
        const py = cy + p.y * scale;
        const alpha =
          p.kind === "letter"
            ? 0.45 + energy * 0.5
            : 0.25 + energy * 0.35;
        ctx.beginPath();
        ctx.fillStyle =
          p.kind === "letter"
            ? `rgba(200,235,255,${alpha})`
            : `rgba(143,200,255,${alpha})`;
        ctx.arc(
          px,
          py,
          p.size * (1 + energy * (p.kind === "letter" ? 0.8 : 0.4)),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [letterPts]);

  return (
    <div
      className={`relative mx-auto flex aspect-square w-full max-w-[min(88vw,380px)] items-center justify-center ${className}`}
      aria-hidden
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
