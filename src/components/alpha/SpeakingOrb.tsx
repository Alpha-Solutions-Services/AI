"use client";

import { useEffect, useRef } from "react";

/** Circular particle orb — animates when Alpha is speaking. */
export function SpeakingOrb({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 120;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const particles = Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return {
        angle: a,
        radius: 28 + (i % 5) * 3,
        speed: 0.012 + (i % 7) * 0.002,
        size: 1.2 + (i % 4) * 0.4,
        phase: Math.random() * Math.PI * 2,
      };
    });

    let raf = 0;
    let t = 0;

    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const pulse = activeRef.current
        ? 1 + Math.sin(t * 0.08) * 0.12
        : 0.85;

      // Core glow
      const core = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34 * pulse);
      core.addColorStop(0, activeRef.current ? "rgba(91,200,255,0.95)" : "rgba(56,163,255,0.35)");
      core.addColorStop(0.45, activeRef.current ? "rgba(56,163,255,0.35)" : "rgba(56,163,255,0.12)");
      core.addColorStop(1, "rgba(5,8,15,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, 36 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Ring
      ctx.strokeStyle = activeRef.current
        ? "rgba(91,200,255,0.55)"
        : "rgba(56,163,255,0.22)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 34 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      for (const p of particles) {
        p.angle += activeRef.current ? p.speed * 1.8 : p.speed * 0.35;
        const wobble =
          Math.sin(t * 0.05 + p.phase) *
          (activeRef.current ? 6 : 1.5);
        const r = (p.radius + wobble) * pulse;
        const x = cx + Math.cos(p.angle) * r;
        const y = cy + Math.sin(p.angle) * r;
        ctx.beginPath();
        ctx.fillStyle = activeRef.current
          ? `rgba(180,230,255,${0.55 + Math.sin(t * 0.1 + p.phase) * 0.35})`
          : "rgba(143,180,212,0.35)";
        ctx.arc(x, y, p.size * (activeRef.current ? 1.35 : 1), 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="pointer-events-none absolute right-3 top-1/2 z-20 -translate-y-1/2 md:right-6"
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className={`transition-opacity duration-300 ${
          active ? "opacity-100" : "opacity-70"
        }`}
      />
    </div>
  );
}
