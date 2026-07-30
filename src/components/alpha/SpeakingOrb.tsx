"use client";

import { useEffect, useMemo, useRef } from "react";

type Mode = "idle" | "listening" | "thinking" | "speaking";

type Particle = {
  kind: "letter" | "orbit" | "dust";
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

function sampleLetterA(count: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const left = (t: number) => ({ x: -0.52 + t * 0.52, y: 0.72 - t * 1.42 });
  const right = (t: number) => ({ x: 0.52 - t * 0.52, y: 0.72 - t * 1.42 });
  const bar = (t: number) => ({ x: -0.26 + t * 0.52, y: 0.1 });

  const nSide = Math.floor(count * 0.42);
  const nBar = count - nSide * 2;
  for (let i = 0; i < nSide; i++) pts.push(left(i / Math.max(1, nSide - 1)));
  for (let i = 0; i < nSide; i++) pts.push(right(i / Math.max(1, nSide - 1)));
  for (let i = 0; i < nBar; i++) pts.push(bar(i / Math.max(1, nBar - 1)));
  return pts;
}

/** Premium centered particle “A” with dual orbit rings. */
export function SpeakingOrb({
  mode = "idle",
  level = 0,
  className = "",
}: {
  mode?: Mode;
  level?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const levelRef = useRef(level);
  const letterPts = useMemo(() => sampleLetterA(96), []);

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
        parent?.clientWidth || 340,
        parent?.clientHeight || 340,
        440
      );
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = css;
      h = css;
      canvas.width = css * dpr;
      canvas.height = css * dpr;
      canvas.style.width = `${css}px`;
      canvas.style.height = `${css}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = css * 0.36;

      particles = [
        ...letterPts.map((p, i) => ({
          kind: "letter" as const,
          tx: p.x,
          ty: p.y,
          x: p.x,
          y: p.y,
          angle: 0,
          orbitR: 0,
          speed: 0,
          size: 1.35 + (i % 5) * 0.28,
          phase: Math.random() * Math.PI * 2,
        })),
        ...Array.from({ length: 42 }, (_, i) => {
          const a = (i / 42) * Math.PI * 2;
          return {
            kind: "orbit" as const,
            tx: 0,
            ty: 0,
            x: Math.cos(a),
            y: Math.sin(a),
            angle: a,
            orbitR: 1.28 + (i % 2) * 0.08,
            speed: 0.006 + (i % 5) * 0.0012,
            size: 1.05 + (i % 3) * 0.25,
            phase: Math.random() * Math.PI * 2,
          };
        }),
        ...Array.from({ length: 28 }, (_, i) => {
          const a = (i / 28) * Math.PI * 2 + 0.2;
          return {
            kind: "dust" as const,
            tx: 0,
            ty: 0,
            x: Math.cos(a),
            y: Math.sin(a),
            angle: a,
            orbitR: 1.55 + (i % 4) * 0.05,
            speed: -0.004 - (i % 4) * 0.0008,
            size: 0.7 + (i % 3) * 0.2,
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
          ? 0.28 + lvl * 0.85
          : modeNow === "listening"
            ? 0.22 + lvl * 0.65
            : modeNow === "thinking"
              ? 0.3 + Math.sin(t * 0.09) * 0.12
              : 0.1;

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;

      // Deep vignette plate
      const plate = ctx.createRadialGradient(cx, cy, scale * 0.2, cx, cy, scale * 1.7);
      plate.addColorStop(0, "rgba(12, 22, 40, 0.55)");
      plate.addColorStop(0.65, "rgba(8, 14, 26, 0.25)");
      plate.addColorStop(1, "rgba(5, 8, 15, 0)");
      ctx.fillStyle = plate;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 1.7, 0, Math.PI * 2);
      ctx.fill();

      // Soft core bloom
      const glowR = scale * (0.7 + energy * 0.2);
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowR);
      grad.addColorStop(0, active ? "rgba(180, 220, 255, 0.35)" : "rgba(90, 160, 220, 0.14)");
      grad.addColorStop(0.4, "rgba(56, 140, 210, 0.1)");
      grad.addColorStop(1, "rgba(5, 8, 15, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Dual rings
      for (const [rMul, alpha] of [
        [1.28, 0.14 + energy * 0.2],
        [1.55, 0.08 + energy * 0.12],
      ] as const) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(120, 190, 240, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.arc(cx, cy, scale * (rMul + energy * 0.04), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Faint stroked A under particles
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.strokeStyle = `rgba(140, 200, 245, ${0.12 + energy * 0.18})`;
      ctx.lineWidth = 0.045;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-0.52, 0.72);
      ctx.lineTo(0, -0.7);
      ctx.lineTo(0.52, 0.72);
      ctx.moveTo(-0.26, 0.1);
      ctx.lineTo(0.26, 0.1);
      ctx.stroke();
      ctx.restore();

      for (const p of particles) {
        if (p.kind === "orbit" || p.kind === "dust") {
          p.angle += p.speed * (active ? 1.35 + energy * 0.8 : 0.35);
          const wobble =
            Math.sin(t * 0.035 + p.phase) * (0.03 + energy * 0.06);
          const r = p.orbitR + wobble;
          p.x = Math.cos(p.angle) * r;
          p.y = Math.sin(p.angle) * r;
        } else {
          const burst =
            modeNow === "speaking"
              ? Math.sin(t * 0.28 + p.phase * 2.4) * energy * 0.14
              : modeNow === "listening"
                ? Math.sin(t * 0.18 + p.phase) * energy * 0.08
                : Math.sin(t * 0.025 + p.phase) * 0.015;
          const targetX = p.tx * (1 + burst);
          const targetY = p.ty * (1 + burst * 0.55);
          p.x += (targetX - p.x) * 0.14;
          p.y += (targetY - p.y) * 0.14;
        }

        const px = cx + p.x * scale;
        const py = cy + p.y * scale;
        const alpha =
          p.kind === "letter"
            ? 0.55 + energy * 0.4
            : p.kind === "orbit"
              ? 0.28 + energy * 0.3
              : 0.14 + energy * 0.2;

        // Soft particle bloom
        if (p.kind === "letter") {
          const g = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3.2);
          g.addColorStop(0, `rgba(230, 245, 255, ${alpha})`);
          g.addColorStop(0.45, `rgba(140, 200, 255, ${alpha * 0.35})`);
          g.addColorStop(1, "rgba(56, 163, 255, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, p.size * (2.6 + energy), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.fillStyle =
          p.kind === "letter"
            ? `rgba(235, 248, 255, ${Math.min(1, alpha + 0.15)})`
            : `rgba(150, 205, 245, ${alpha})`;
        ctx.arc(
          px,
          py,
          p.size * (1 + energy * (p.kind === "letter" ? 0.55 : 0.25)),
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
      className={`relative mx-auto flex aspect-square w-full max-w-[min(86vw,400px)] items-center justify-center ${className}`}
      aria-hidden
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
