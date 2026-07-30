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

const RINGS = [0.72, 0.88, 1.05, 1.22, 1.4, 1.58];

/** JARVIS-style holographic A core with 6 HUD rings. */
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
  const letterPts = useMemo(() => sampleLetterA(110), []);

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
        parent?.clientWidth || 360,
        parent?.clientHeight || 360,
        460
      );
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = css;
      h = css;
      canvas.width = css * dpr;
      canvas.height = css * dpr;
      canvas.style.width = `${css}px`;
      canvas.style.height = `${css}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = css * 0.32;

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
          size: 1.2 + (i % 5) * 0.25,
          phase: Math.random() * Math.PI * 2,
        })),
        ...Array.from({ length: 56 }, (_, i) => {
          const ring = RINGS[2 + (i % 4)];
          const a = (i / 56) * Math.PI * 2;
          return {
            kind: "orbit" as const,
            tx: 0,
            ty: 0,
            x: Math.cos(a) * ring,
            y: Math.sin(a) * ring,
            angle: a,
            orbitR: ring,
            speed: (i % 2 === 0 ? 1 : -1) * (0.004 + (i % 5) * 0.001),
            size: 0.9 + (i % 3) * 0.25,
            phase: Math.random() * Math.PI * 2,
          };
        }),
        ...Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return {
            kind: "dust" as const,
            tx: 0,
            ty: 0,
            x: Math.cos(a),
            y: Math.sin(a),
            angle: a,
            orbitR: 1.65 + (i % 3) * 0.04,
            speed: -0.003 - (i % 4) * 0.0006,
            size: 0.55,
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
          ? 0.3 + lvl * 0.85
          : modeNow === "listening"
            ? 0.25 + lvl * 0.65
            : modeNow === "thinking"
              ? 0.32 + Math.sin(t * 0.09) * 0.12
              : 0.12;

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;

      // Projection pedestal glow
      const base = ctx.createRadialGradient(
        cx,
        cy + scale * 1.15,
        2,
        cx,
        cy + scale * 1.15,
        scale * 0.9
      );
      base.addColorStop(0, `rgba(0, 191, 255, ${0.18 + energy * 0.2})`);
      base.addColorStop(1, "rgba(0, 191, 255, 0)");
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.ellipse(cx, cy + scale * 1.2, scale * 0.85, scale * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Core bloom
      const glowR = scale * (0.75 + energy * 0.2);
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowR);
      grad.addColorStop(0, active ? "rgba(180, 235, 255, 0.4)" : "rgba(0, 191, 255, 0.16)");
      grad.addColorStop(0.45, "rgba(0, 160, 220, 0.1)");
      grad.addColorStop(1, "rgba(5, 10, 18, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // 6 HUD rings
      RINGS.forEach((rMul, idx) => {
        const spin = t * (0.004 + idx * 0.0015) * (idx % 2 === 0 ? 1 : -1);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(spin);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0, 191, 255, ${0.08 + energy * 0.12 + (idx === 3 ? 0.08 : 0)})`;
        ctx.lineWidth = idx === 0 || idx === 5 ? 1.4 : 0.9;
        ctx.setLineDash(idx % 2 === 0 ? [6, 8] : []);
        ctx.arc(0, 0, scale * (rMul + energy * 0.03), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // tick marks
        if (idx === 2 || idx === 4) {
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2;
            const r0 = scale * rMul;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(79, 195, 247, ${0.2 + energy * 0.2})`;
            ctx.lineWidth = 1;
            ctx.moveTo(Math.cos(a) * r0 * 0.96, Math.sin(a) * r0 * 0.96);
            ctx.lineTo(Math.cos(a) * r0 * 1.04, Math.sin(a) * r0 * 1.04);
            ctx.stroke();
          }
        }
        ctx.restore();
      });

      // Stroked A
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.strokeStyle = `rgba(0, 191, 255, ${0.2 + energy * 0.25})`;
      ctx.lineWidth = 0.05;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(0, 191, 255, 0.65)";
      ctx.shadowBlur = 12;
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
          p.angle += p.speed * (active ? 1.5 + energy : 0.4);
          const wobble = Math.sin(t * 0.03 + p.phase) * (0.02 + energy * 0.05);
          const r = p.orbitR + wobble;
          p.x = Math.cos(p.angle) * r;
          p.y = Math.sin(p.angle) * r;
        } else {
          const burst =
            modeNow === "speaking"
              ? Math.sin(t * 0.28 + p.phase * 2.2) * energy * 0.14
              : modeNow === "listening"
                ? Math.sin(t * 0.18 + p.phase) * energy * 0.08
                : Math.sin(t * 0.025 + p.phase) * 0.012;
          p.x += (p.tx * (1 + burst) - p.x) * 0.14;
          p.y += (p.ty * (1 + burst * 0.55) - p.y) * 0.14;
        }

        const px = cx + p.x * scale;
        const py = cy + p.y * scale;
        const alpha =
          p.kind === "letter"
            ? 0.6 + energy * 0.35
            : p.kind === "orbit"
              ? 0.3 + energy * 0.28
              : 0.12 + energy * 0.15;

        if (p.kind === "letter") {
          const g = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3);
          g.addColorStop(0, `rgba(230, 248, 255, ${alpha})`);
          g.addColorStop(0.5, `rgba(0, 191, 255, ${alpha * 0.35})`);
          g.addColorStop(1, "rgba(0, 191, 255, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, p.size * (2.4 + energy), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.fillStyle =
          p.kind === "letter"
            ? `rgba(235, 250, 255, ${Math.min(1, alpha + 0.1)})`
            : `rgba(79, 195, 247, ${alpha})`;
        ctx.arc(
          px,
          py,
          p.size * (1 + energy * (p.kind === "letter" ? 0.5 : 0.2)),
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
      className={`relative mx-auto flex aspect-square w-full max-w-[min(78vw,380px)] items-center justify-center ${className}`}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute bottom-[6%] left-1/2 h-[28%] w-[62%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(0,191,255,0.45),_transparent_70%)] blur-md"
        style={{
          opacity: mode === "idle" ? 0.55 : 0.85,
          boxShadow: "0 0 40px rgba(0,191,255,0.35)",
        }}
      />
      <canvas ref={canvasRef} className="relative z-10 h-full w-full" />
    </div>
  );
}
