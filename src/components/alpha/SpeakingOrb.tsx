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
  const left = (t: number) => ({ x: -0.5 + t * 0.5, y: 0.7 - t * 1.4 });
  const right = (t: number) => ({ x: 0.5 - t * 0.5, y: 0.7 - t * 1.4 });
  const bar = (t: number) => ({ x: -0.24 + t * 0.48, y: 0.1 });
  const nSide = Math.floor(count * 0.4);
  const nBar = count - nSide * 2;
  for (let i = 0; i < nSide; i++) pts.push(left(i / Math.max(1, nSide - 1)));
  for (let i = 0; i < nSide; i++) pts.push(right(i / Math.max(1, nSide - 1)));
  for (let i = 0; i < nBar; i++) pts.push(bar(i / Math.max(1, nBar - 1)));
  return pts;
}

const RINGS = [0.82, 1.02, 1.22, 1.42];

/** Professional particle A — constellation glow, no grid/cross-hatch. */
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
        400
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
        ...letterPts.map((p, i) => ({
          kind: "letter" as const,
          tx: p.x,
          ty: p.y,
          x: p.x,
          y: p.y,
          angle: 0,
          orbitR: 0,
          speed: 0,
          size: 0.85 + (i % 4) * 0.12,
          phase: Math.random() * Math.PI * 2,
        })),
        ...Array.from({ length: 36 }, (_, i) => {
          const ring = RINGS[1 + (i % 3)];
          const a = (i / 36) * Math.PI * 2;
          return {
            kind: "orbit" as const,
            tx: 0,
            ty: 0,
            x: Math.cos(a) * ring,
            y: Math.sin(a) * ring,
            angle: a,
            orbitR: ring,
            speed: (i % 2 === 0 ? 1 : -1) * (0.003 + (i % 5) * 0.0008),
            size: 0.7,
            phase: Math.random() * Math.PI * 2,
          };
        }),
        ...Array.from({ length: 18 }, (_, i) => {
          const a = (i / 18) * Math.PI * 2;
          return {
            kind: "dust" as const,
            tx: 0,
            ty: 0,
            x: Math.cos(a),
            y: Math.sin(a),
            angle: a,
            orbitR: 1.5 + (i % 3) * 0.04,
            speed: -0.0025 - (i % 4) * 0.0005,
            size: 0.45,
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
          ? 0.28 + lvl * 0.7
          : modeNow === "listening"
            ? 0.22 + lvl * 0.55
            : modeNow === "thinking"
              ? 0.26 + Math.sin(t * 0.09) * 0.1
              : 0.1;

      c.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;

      const base = c.createRadialGradient(
        cx,
        cy + scale * 1.1,
        1,
        cx,
        cy + scale * 1.1,
        scale * 0.8
      );
      base.addColorStop(0, `rgba(0, 170, 220, ${0.14 + energy * 0.14})`);
      base.addColorStop(1, "rgba(0, 170, 220, 0)");
      c.fillStyle = base;
      c.beginPath();
      c.ellipse(cx, cy + scale * 1.12, scale * 0.7, scale * 0.12, 0, 0, Math.PI * 2);
      c.fill();

      const glowR = scale * (0.85 + energy * 0.15);
      const grad = c.createRadialGradient(cx, cy, 2, cx, cy, glowR);
      grad.addColorStop(0, `rgba(0, 180, 230, ${0.1 + energy * 0.12})`);
      grad.addColorStop(1, "rgba(5, 10, 18, 0)");
      c.fillStyle = grad;
      c.beginPath();
      c.arc(cx, cy, glowR, 0, Math.PI * 2);
      c.fill();

      RINGS.forEach((rMul, idx) => {
        const spin = t * (0.0025 + idx * 0.001) * (idx % 2 === 0 ? 1 : -1);
        c.save();
        c.translate(cx, cy);
        c.rotate(spin);
        c.beginPath();
        c.strokeStyle = `rgba(100, 190, 230, ${0.1 + energy * 0.1})`;
        c.lineWidth = 0.85;
        c.setLineDash(idx % 2 === 0 ? [4, 9] : [14, 12]);
        c.arc(0, 0, scale * (rMul + energy * 0.02), 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
        c.restore();
      });

      // Thin outline A under particles
      c.save();
      c.translate(cx, cy);
      c.scale(scale, scale);
      c.strokeStyle = `rgba(160, 220, 245, ${0.22 + energy * 0.2})`;
      c.lineWidth = 0.035;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.shadowColor = "rgba(0, 180, 230, 0.4)";
      c.shadowBlur = 10;
      c.beginPath();
      c.moveTo(-0.5, 0.7);
      c.lineTo(0, -0.7);
      c.lineTo(0.5, 0.7);
      c.moveTo(-0.24, 0.1);
      c.lineTo(0.24, 0.1);
      c.stroke();
      c.restore();

      for (const p of particles) {
        if (p.kind === "orbit" || p.kind === "dust") {
          p.angle += p.speed * (active ? 1.4 + energy : 0.45);
          const wobble = Math.sin(t * 0.028 + p.phase) * (0.015 + energy * 0.04);
          const r = p.orbitR + wobble;
          p.x = Math.cos(p.angle) * r;
          p.y = Math.sin(p.angle) * r;
        } else {
          const burst =
            modeNow === "speaking"
              ? Math.sin(t * 0.25 + p.phase * 2) * energy * 0.1
              : modeNow === "listening"
                ? Math.sin(t * 0.16 + p.phase) * energy * 0.06
                : Math.sin(t * 0.022 + p.phase) * 0.01;
          p.x += (p.tx * (1 + burst) - p.x) * 0.12;
          p.y += (p.ty * (1 + burst * 0.5) - p.y) * 0.12;
        }

        const px = cx + p.x * scale;
        const py = cy + p.y * scale;
        const alpha =
          p.kind === "letter"
            ? 0.55 + energy * 0.35
            : p.kind === "orbit"
              ? 0.28 + energy * 0.25
              : 0.12 + energy * 0.12;

        // Soft bloom only for letter particles — tight, not cartoon blobs
        if (p.kind === "letter") {
          const g = c.createRadialGradient(px, py, 0, px, py, p.size * 2.2);
          g.addColorStop(0, `rgba(220, 245, 255, ${alpha * 0.85})`);
          g.addColorStop(0.55, `rgba(0, 180, 230, ${alpha * 0.25})`);
          g.addColorStop(1, "rgba(0, 180, 230, 0)");
          c.fillStyle = g;
          c.beginPath();
          c.arc(px, py, p.size * (1.8 + energy * 0.4), 0, Math.PI * 2);
          c.fill();
        }

        c.beginPath();
        c.fillStyle =
          p.kind === "letter"
            ? `rgba(230, 248, 255, ${Math.min(1, alpha)})`
            : `rgba(100, 195, 235, ${alpha})`;
        c.arc(
          px,
          py,
          p.size * (1 + energy * (p.kind === "letter" ? 0.25 : 0.15)),
          0,
          Math.PI * 2
        );
        c.fill();
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
      className={`relative mx-auto flex aspect-square w-full max-w-[min(70vw,320px)] items-center justify-center ${className}`}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute bottom-[8%] left-1/2 h-[16%] w-[46%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(0,160,210,0.3),_transparent_72%)] blur-sm"
        style={{ opacity: mode === "idle" ? 0.4 : 0.7 }}
      />
      <canvas ref={canvasRef} className="relative z-10 h-full w-full" />
    </div>
  );
}
