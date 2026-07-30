"use client";

import { useEffect, useRef } from "react";

type Mode = "idle" | "listening" | "thinking" | "speaking";

/**
 * Professional holographic A — thin wireframe + fine mesh, not cartoon dots.
 */
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
    let w = 0;
    let h = 0;
    let scale = 1;

    // A silhouette in normalized units (wireframe vertices)
    const A_OUTER: [number, number][] = [
      [-0.48, 0.68],
      [0, -0.72],
      [0.48, 0.68],
    ];
    const A_BAR: [number, number][] = [
      [-0.22, 0.12],
      [0.22, 0.12],
    ];
    // Inner parallel strokes (double-line tech look)
    const A_INNER_L: [number, number][] = [
      [-0.34, 0.58],
      [-0.06, -0.42],
    ];
    const A_INNER_R: [number, number][] = [
      [0.34, 0.58],
      [0.06, -0.42],
    ];

    const resize = () => {
      const parent = canvas.parentElement;
      const css = Math.min(
        parent?.clientWidth || 360,
        parent?.clientHeight || 360,
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
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    function strokePoly(
      pts: [number, number][],
      color: string,
      lineWidth: number,
      close = false
    ) {
      c.beginPath();
      c.strokeStyle = color;
      c.lineWidth = lineWidth;
      c.lineCap = "round";
      c.lineJoin = "round";
      pts.forEach(([x, y], i) => {
        const px = x * scale;
        const py = y * scale;
        if (i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      });
      if (close) c.closePath();
      c.stroke();
    }

    function node(x: number, y: number, r: number, a: number) {
      c.beginPath();
      c.fillStyle = `rgba(200, 235, 255, ${a})`;
      c.arc(x * scale, y * scale, r, 0, Math.PI * 2);
      c.fill();
    }

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
          ? 0.22 + lvl * 0.55
          : modeNow === "listening"
            ? 0.2 + lvl * 0.45
            : modeNow === "thinking"
              ? 0.24 + Math.sin(t * 0.08) * 0.08
              : 0.1;

      c.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2 + scale * 0.02;

      // Soft pedestal (subtle, not neon blob)
      const base = c.createRadialGradient(
        cx,
        cy + scale * 1.05,
        1,
        cx,
        cy + scale * 1.05,
        scale * 0.75
      );
      base.addColorStop(0, `rgba(0, 160, 210, ${0.12 + energy * 0.12})`);
      base.addColorStop(1, "rgba(0, 160, 210, 0)");
      c.fillStyle = base;
      c.beginPath();
      c.ellipse(
        cx,
        cy + scale * 1.08,
        scale * 0.72,
        scale * 0.12,
        0,
        0,
        Math.PI * 2
      );
      c.fill();

      // Core bloom — restrained
      const glowR = scale * (0.95 + energy * 0.12);
      const grad = c.createRadialGradient(cx, cy, 2, cx, cy, glowR);
      grad.addColorStop(0, `rgba(0, 180, 230, ${0.08 + energy * 0.1})`);
      grad.addColorStop(0.55, "rgba(0, 140, 200, 0.04)");
      grad.addColorStop(1, "rgba(5, 10, 18, 0)");
      c.fillStyle = grad;
      c.beginPath();
      c.arc(cx, cy, glowR, 0, Math.PI * 2);
      c.fill();

      // HUD rings — thin, precise
      const rings = [0.78, 0.98, 1.18, 1.38];
      rings.forEach((rMul, idx) => {
        const spin = t * (0.002 + idx * 0.0008) * (idx % 2 === 0 ? 1 : -1);
        c.save();
        c.translate(cx, cy);
        c.rotate(spin);
        c.beginPath();
        const alpha = 0.1 + energy * 0.1 + (idx === 1 ? 0.06 : 0);
        c.strokeStyle = `rgba(100, 190, 230, ${alpha})`;
        c.lineWidth = idx === 0 ? 1.1 : 0.7;
        if (idx % 2 === 0) c.setLineDash([3, 10]);
        else c.setLineDash([18, 14]);
        c.arc(0, 0, scale * (rMul + energy * 0.015), 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);

        // Sparse precision ticks
        if (idx === 1 || idx === 3) {
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2;
            const r0 = scale * rMul;
            c.beginPath();
            c.strokeStyle = `rgba(120, 200, 235, ${0.18 + energy * 0.15})`;
            c.lineWidth = 0.8;
            c.moveTo(Math.cos(a) * r0 * 0.97, Math.sin(a) * r0 * 0.97);
            c.lineTo(Math.cos(a) * r0 * 1.03, Math.sin(a) * r0 * 1.03);
            c.stroke();
          }
        }
        c.restore();
      });

      // Scan arc
      c.save();
      c.translate(cx, cy);
      c.rotate(t * 0.012);
      c.beginPath();
      c.strokeStyle = `rgba(0, 191, 255, ${0.25 + energy * 0.25})`;
      c.lineWidth = 1.2;
      c.arc(0, 0, scale * 1.18, -0.35, 0.55);
      c.stroke();
      c.restore();

      c.save();
      c.translate(cx, cy);

      // Mesh fill inside A (fine lattice — professional, not bubbly)
      c.save();
      c.beginPath();
      c.moveTo(A_OUTER[0][0] * scale, A_OUTER[0][1] * scale);
      c.lineTo(A_OUTER[1][0] * scale, A_OUTER[1][1] * scale);
      c.lineTo(A_OUTER[2][0] * scale, A_OUTER[2][1] * scale);
      c.closePath();
      // cut bar window roughly by not filling full — clip to outer then draw lines
      c.clip();

      const meshAlpha = 0.06 + energy * 0.08;
      c.strokeStyle = `rgba(120, 200, 235, ${meshAlpha})`;
      c.lineWidth = 0.5;
      for (let i = -6; i <= 6; i++) {
        c.beginPath();
        c.moveTo(i * scale * 0.1, -scale);
        c.lineTo(i * scale * 0.1, scale);
        c.stroke();
      }
      for (let i = -6; i <= 6; i++) {
        c.beginPath();
        c.moveTo(-scale, i * scale * 0.1);
        c.lineTo(scale, i * scale * 0.1);
        c.stroke();
      }
      c.restore();

      // Primary A strokes
      const strokeA = 0.35 + energy * 0.35;
      c.shadowColor = "rgba(0, 180, 230, 0.45)";
      c.shadowBlur = 8 + energy * 6;

      strokePoly(
        A_OUTER,
        `rgba(180, 230, 255, ${strokeA})`,
        1.6 + energy * 0.4,
        false
      );
      strokePoly(A_BAR, `rgba(180, 230, 255, ${strokeA})`, 1.5);

      c.shadowBlur = 0;
      strokePoly(
        A_INNER_L,
        `rgba(0, 180, 220, ${0.25 + energy * 0.2})`,
        0.9
      );
      strokePoly(
        A_INNER_R,
        `rgba(0, 180, 220, ${0.25 + energy * 0.2})`,
        0.9
      );

      // Corner nodes — tiny, sharp
      const nodes: [number, number][] = [
        [-0.48, 0.68],
        [0, -0.72],
        [0.48, 0.68],
        [-0.22, 0.12],
        [0.22, 0.12],
        [-0.18, 0.35],
        [0.18, 0.35],
      ];
      nodes.forEach(([x, y], i) => {
        const pulse =
          active && i < 3
            ? 0.55 + Math.sin(t * 0.12 + i) * 0.2 * energy
            : 0.45;
        node(x, y, 1.6 + energy * 0.4, pulse);
      });

      // Orbiting micro-nodes (sparse, not particle soup)
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + t * 0.008 * (i % 2 === 0 ? 1 : -1);
        const r = scale * (1.05 + (i % 3) * 0.08);
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        c.beginPath();
        c.fillStyle = `rgba(120, 200, 235, ${0.2 + energy * 0.25})`;
        c.arc(px, py, 1.1, 0, Math.PI * 2);
        c.fill();
      }

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
        className="pointer-events-none absolute bottom-[8%] left-1/2 h-[18%] w-[48%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(0,160,210,0.28),_transparent_72%)] blur-sm"
        style={{ opacity: mode === "idle" ? 0.45 : 0.7 }}
      />
      <canvas ref={canvasRef} className="relative z-10 h-full w-full" />
    </div>
  );
}
