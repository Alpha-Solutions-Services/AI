"use client";

import { useEffect, useRef } from "react";

type Mode = "idle" | "listening" | "thinking" | "speaking";

type Particle = {
  kind: "orbit" | "dust";
  x: number;
  y: number;
  angle: number;
  orbitR: number;
  speed: number;
  size: number;
  phase: number;
};

const RINGS = [0.88, 1.08, 1.28, 1.48];

/** Premium holographic A — bold filled mark with orbiting constellation. */
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
    const c = ctx;

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
        420
      );
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = css;
      h = css;
      canvas.width = css * dpr;
      canvas.height = css * dpr;
      canvas.style.width = `${css}px`;
      canvas.style.height = `${css}px`;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = css * 0.3;

      particles = [
        ...Array.from({ length: 42 }, (_, i) => {
          const ring = RINGS[1 + (i % 3)];
          const a = (i / 42) * Math.PI * 2;
          return {
            kind: "orbit" as const,
            x: Math.cos(a) * ring,
            y: Math.sin(a) * ring,
            angle: a,
            orbitR: ring,
            speed: (i % 2 === 0 ? 1 : -1) * (0.0028 + (i % 5) * 0.0007),
            size: 0.9,
            phase: Math.random() * Math.PI * 2,
          };
        }),
        ...Array.from({ length: 22 }, (_, i) => {
          const a = (i / 22) * Math.PI * 2;
          return {
            kind: "dust" as const,
            x: Math.cos(a),
            y: Math.sin(a),
            angle: a,
            orbitR: 1.55 + (i % 3) * 0.05,
            speed: -0.0022 - (i % 4) * 0.0004,
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
          ? 0.3 + lvl * 0.7
          : modeNow === "listening"
            ? 0.24 + lvl * 0.55
            : modeNow === "thinking"
              ? 0.28 + Math.sin(t * 0.09) * 0.1
              : 0.12;

      c.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;

      // Soft pedestal
      const base = c.createRadialGradient(
        cx,
        cy + scale * 1.1,
        1,
        cx,
        cy + scale * 1.1,
        scale * 0.85
      );
      base.addColorStop(0, `rgba(56, 189, 248, ${0.2 + energy * 0.18})`);
      base.addColorStop(1, "rgba(56, 189, 248, 0)");
      c.fillStyle = base;
      c.beginPath();
      c.ellipse(cx, cy + scale * 1.12, scale * 0.78, scale * 0.15, 0, 0, Math.PI * 2);
      c.fill();

      // Core glow
      const glowR = scale * (0.95 + energy * 0.2);
      const grad = c.createRadialGradient(cx, cy, 2, cx, cy, glowR);
      grad.addColorStop(0, `rgba(56, 189, 248, ${0.16 + energy * 0.16})`);
      grad.addColorStop(1, "rgba(3, 7, 18, 0)");
      c.fillStyle = grad;
      c.beginPath();
      c.arc(cx, cy, glowR, 0, Math.PI * 2);
      c.fill();

      RINGS.forEach((rMul, idx) => {
        const spin = t * (0.0022 + idx * 0.0009) * (idx % 2 === 0 ? 1 : -1);
        c.save();
        c.translate(cx, cy);
        c.rotate(spin);
        c.beginPath();
        c.strokeStyle = `rgba(125, 211, 252, ${0.14 + energy * 0.12})`;
        c.lineWidth = 1.1;
        c.setLineDash(idx % 2 === 0 ? [5, 10] : [16, 14]);
        c.arc(0, 0, scale * (rMul + energy * 0.02), 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
        c.restore();
      });

      for (const p of particles) {
        p.angle += p.speed * (active ? 1.35 + energy : 0.4);
        const wobble =
          Math.sin(t * 0.028 + p.phase) * (0.015 + energy * 0.04);
        const r = p.orbitR + wobble;
        p.x = Math.cos(p.angle) * r;
        p.y = Math.sin(p.angle) * r;

        const px = cx + p.x * scale;
        const py = cy + p.y * scale;
        const alpha =
          p.kind === "orbit" ? 0.32 + energy * 0.28 : 0.14 + energy * 0.12;

        c.beginPath();
        c.fillStyle = `rgba(125, 211, 252, ${alpha})`;
        c.arc(px, py, p.size * (1 + energy * 0.18), 0, Math.PI * 2);
        c.fill();
      }

      // Bold filled A — solid premium weight
      const pulse = 1 + energy * 0.045;
      const fontPx = Math.round(scale * 2.15 * pulse);
      c.save();
      c.textAlign = "center";
      c.textBaseline = "middle";

      c.shadowColor = "rgba(56, 189, 248, 0.8)";
      c.shadowBlur = 40 + energy * 22;
      c.strokeStyle = `rgba(14, 165, 233, ${0.55 + energy * 0.2})`;
      c.lineWidth = Math.max(8, scale * 0.12);
      c.lineJoin = "round";
      c.font = `900 ${fontPx}px "Arial Black", Impact, sans-serif`;
      c.strokeText("A", cx, cy + scale * 0.05);
      c.fillStyle = `rgba(14, 165, 233, ${0.55 + energy * 0.2})`;
      c.fillText("A", cx, cy + scale * 0.05);

      c.shadowBlur = 18;
      c.fillStyle = `rgba(186, 230, 253, ${0.92 + energy * 0.08})`;
      c.font = `900 ${Math.round(fontPx * 0.92)}px "Arial Black", Impact, sans-serif`;
      c.fillText("A", cx, cy + scale * 0.05);

      c.shadowBlur = 0;
      c.fillStyle = `rgba(255, 255, 255, 0.98)`;
      c.font = `900 ${Math.round(fontPx * 0.82)}px "Arial Black", Impact, sans-serif`;
      c.fillText("A", cx, cy + scale * 0.05);
      c.restore();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className={`relative mx-auto flex aspect-square w-full max-w-[min(72vw,340px)] items-center justify-center ${className}`}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.16),_transparent_68%)] blur-2xl"
        style={{ opacity: mode === "idle" ? 0.5 : 0.85 }}
      />
      <div
        className="pointer-events-none absolute bottom-[6%] left-1/2 h-[18%] w-[52%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.4),_transparent_72%)] blur-md"
        style={{ opacity: mode === "idle" ? 0.5 : 0.85 }}
      />
      <canvas ref={canvasRef} className="relative z-10 h-full w-full" />
    </div>
  );
}
