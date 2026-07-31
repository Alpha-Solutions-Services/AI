"use client";

import { useEffect, useRef } from "react";

type Mode = "idle" | "listening" | "thinking" | "speaking";

type Vec3 = { x: number; y: number; z: number };

type Particle = {
  kind: "globe" | "letter" | "ring" | "dust";
  base: Vec3;
  size: number;
  phase: number;
  bright: number;
};

const FOV = 2.6;
const GLOBE_R = 1;

function fibonacciSphere(count: number, radius: number): Vec3[] {
  const pts: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    });
  }
  return pts;
}

function sampleRing(count: number, radius: number, tilt: number): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const y = 0;
    // tilt around X
    pts.push({
      x,
      y: y * Math.cos(tilt) - z * Math.sin(tilt),
      z: y * Math.sin(tilt) + z * Math.cos(tilt),
    });
  }
  return pts;
}

/** Thick 3D letter A — extruded volumetric ribbons with real depth. */
function sampleLetterA3D(): Vec3[] {
  const pts: Vec3[] = [];
  const left = (t: number, ox: number, oz: number) => ({
    x: -0.48 + t * 0.48 + ox,
    y: 0.58 - t * 1.16,
    z: oz,
  });
  const right = (t: number, ox: number, oz: number) => ({
    x: 0.48 - t * 0.48 + ox,
    y: 0.58 - t * 1.16,
    z: oz,
  });
  const bar = (t: number, oy: number, oz: number) => ({
    x: -0.28 + t * 0.56,
    y: 0.06 + oy,
    z: oz,
  });

  // Wider extrusion = thicker premium strokes
  const depthLayers = [-0.18, -0.12, -0.06, 0, 0.06, 0.12, 0.18];
  const strokeW = [-0.08, -0.055, -0.03, -0.01, 0.01, 0.03, 0.055, 0.08];
  const n = 36;

  for (const oz of depthLayers) {
    for (const ox of strokeW) {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        pts.push(left(t, ox * 0.75, oz));
        pts.push(right(t, ox * 0.75, oz));
      }
    }
    for (const oy of [-0.06, -0.04, -0.02, 0, 0.02, 0.04, 0.06]) {
      for (let i = 0; i < 28; i++) {
        pts.push(bar(i / 27, oy, oz));
      }
    }
  }
  return pts;
}

function rotateY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c - p.z * s, y: p.y, z: p.x * s + p.z * c };
}

function rotateX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

function project(p: Vec3, scale: number, cx: number, cy: number) {
  const z = p.z + FOV;
  const persp = FOV / Math.max(0.35, z);
  return {
    x: cx + p.x * scale * persp,
    y: cy + p.y * scale * persp,
    depth: persp,
    z: p.z,
  };
}

/**
 * 3D AI particle globe with volumetric holographic Alpha A.
 * Inspired by premium particle-sphere / holographic orb aesthetics.
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
    let particles: Particle[] = [];
    let w = 0;
    let h = 0;
    let scale = 1;

    const build = () => {
      const globe = fibonacciSphere(780, GLOBE_R).map((base, i) => ({
        kind: "globe" as const,
        base,
        size: 0.55 + (i % 5) * 0.08,
        phase: Math.random() * Math.PI * 2,
        bright: 0.28 + Math.random() * 0.32,
      }));

      const letter = sampleLetterA3D().map((base, i) => ({
        kind: "letter" as const,
        base: {
          x: base.x * 0.88,
          y: base.y * 0.88,
          z: base.z * 0.88,
        },
        size: 0.95 + (i % 4) * 0.12,
        phase: Math.random() * Math.PI * 2,
        bright: 0.8 + Math.random() * 0.2,
      }));

      const rings = [
        ...sampleRing(96, 1.2, 0.58),
        ...sampleRing(84, 1.36, -0.42),
        ...sampleRing(72, 1.5, 0.28),
      ].map((base, i) => ({
        kind: "ring" as const,
        base,
        size: 0.55,
        phase: Math.random() * Math.PI * 2,
        bright: 0.38 + (i % 3) * 0.1,
      }));

      const dust = Array.from({ length: 48 }, (_, i) => {
        const a = Math.random() * Math.PI * 2;
        const b = Math.acos(2 * Math.random() - 1);
        const r = 1.65 + Math.random() * 0.35;
        return {
          kind: "dust" as const,
          base: {
            x: r * Math.sin(b) * Math.cos(a),
            y: r * Math.cos(b),
            z: r * Math.sin(b) * Math.sin(a),
          },
          size: 0.45,
          phase: Math.random() * Math.PI * 2,
          bright: 0.2,
        };
      });

      particles = [...globe, ...letter, ...rings, ...dust];
    };

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
      scale = css * 0.28;
      build();
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = () => {
      t += 1;
      const modeNow = modeRef.current;
      const lvl = Math.max(0, Math.min(1, levelRef.current));
      const energy =
        modeNow === "speaking"
          ? 0.32 + lvl * 0.68
          : modeNow === "listening"
            ? 0.26 + lvl * 0.5
            : modeNow === "thinking"
              ? 0.28 + Math.sin(t * 0.08) * 0.1
              : 0.14;

      const spinY =
        t *
        (modeNow === "idle"
          ? 0.0045
          : modeNow === "listening"
            ? 0.007
            : modeNow === "speaking"
              ? 0.01
              : 0.008);
      const spinX = 0.38 + Math.sin(t * 0.004) * 0.05;

      c.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2 + scale * 0.02;

      // Atmospheric shell
      const shell = c.createRadialGradient(cx, cy, scale * 0.2, cx, cy, scale * 1.55);
      shell.addColorStop(0, `rgba(56, 189, 248, ${0.08 + energy * 0.1})`);
      shell.addColorStop(0.55, `rgba(14, 165, 233, ${0.04 + energy * 0.04})`);
      shell.addColorStop(1, "rgba(3, 7, 18, 0)");
      c.fillStyle = shell;
      c.beginPath();
      c.arc(cx, cy, scale * 1.55, 0, Math.PI * 2);
      c.fill();

      // Soft pedestal
      const ped = c.createRadialGradient(
        cx,
        cy + scale * 1.25,
        1,
        cx,
        cy + scale * 1.25,
        scale * 0.85
      );
      ped.addColorStop(0, `rgba(56, 189, 248, ${0.22 + energy * 0.16})`);
      ped.addColorStop(1, "rgba(56, 189, 248, 0)");
      c.fillStyle = ped;
      c.beginPath();
      c.ellipse(cx, cy + scale * 1.28, scale * 0.72, scale * 0.12, 0, 0, Math.PI * 2);
      c.fill();

      // Luminous core
      const core = c.createRadialGradient(cx, cy, 1, cx, cy, scale * 0.55);
      core.addColorStop(0, `rgba(240, 249, 255, ${0.18 + energy * 0.2})`);
      core.addColorStop(0.35, `rgba(56, 189, 248, ${0.12 + energy * 0.12})`);
      core.addColorStop(1, "rgba(56, 189, 248, 0)");
      c.fillStyle = core;
      c.beginPath();
      c.arc(cx, cy, scale * 0.55, 0, Math.PI * 2);
      c.fill();

      type Projected = {
        p: Particle;
        sx: number;
        sy: number;
        depth: number;
        z: number;
      };
      const projected: Projected[] = [];

      for (const p of particles) {
        let pos = p.base;
        // subtle breathing on globe
        if (p.kind === "globe") {
          const breathe =
            1 + Math.sin(t * 0.03 + p.phase) * (0.012 + energy * 0.02);
          pos = {
            x: pos.x * breathe,
            y: pos.y * breathe,
            z: pos.z * breathe,
          };
        }
        if (p.kind === "letter") {
          const pulse =
            1 + Math.sin(t * 0.05 + p.phase) * (0.01 + energy * 0.025);
          pos = {
            x: pos.x * pulse,
            y: pos.y * pulse,
            z: pos.z * pulse,
          };
        }

        pos = rotateY(pos, spinY);
        pos = rotateX(pos, spinX);
        const pr = project(pos, scale, cx, cy);
        projected.push({
          p,
          sx: pr.x,
          sy: pr.y,
          depth: pr.depth,
          z: pr.z,
        });
      }

      // Back-to-front for proper occlusion feel
      projected.sort((a, b) => a.z - b.z);

      // Continuous thick A ribbons (volumetric glow under particles)
      c.save();
      c.lineCap = "round";
      c.lineJoin = "round";
      const aDepths = [-0.16, -0.08, 0, 0.08, 0.16];
      const aWidths = [-0.06, 0, 0.06];
      for (const oz of aDepths) {
        for (const ox of aWidths) {
          const leftPts: { x: number; y: number; z: number }[] = [];
          const rightPts: { x: number; y: number; z: number }[] = [];
          const barPts: { x: number; y: number; z: number }[] = [];
          for (let i = 0; i <= 24; i++) {
            const t = i / 24;
            let lp = {
              x: (-0.48 + t * 0.48 + ox * 0.75) * 0.88,
              y: (0.58 - t * 1.16) * 0.88,
              z: oz * 0.88,
            };
            let rp = {
              x: (0.48 - t * 0.48 + ox * 0.75) * 0.88,
              y: (0.58 - t * 1.16) * 0.88,
              z: oz * 0.88,
            };
            lp = rotateY(lp, spinY);
            lp = rotateX(lp, spinX);
            rp = rotateY(rp, spinY);
            rp = rotateX(rp, spinX);
            leftPts.push(lp);
            rightPts.push(rp);
          }
          for (let i = 0; i <= 18; i++) {
            const t = i / 18;
            let bp = {
              x: (-0.28 + t * 0.56) * 0.88,
              y: (0.06 + ox * 0.5) * 0.88,
              z: oz * 0.88,
            };
            bp = rotateY(bp, spinY);
            bp = rotateX(bp, spinX);
            barPts.push(bp);
          }

          const strokePath = (pts: Vec3[], width: number, alpha: number) => {
            if (pts.length < 2) return;
            c.beginPath();
            const first = project(pts[0], scale, cx, cy);
            c.moveTo(first.x, first.y);
            for (let i = 1; i < pts.length; i++) {
              const pr = project(pts[i], scale, cx, cy);
              c.lineTo(pr.x, pr.y);
            }
            const midZ = pts[Math.floor(pts.length / 2)].z;
            const fade = 0.35 + ((midZ + 1.2) / 2.4) * 0.65;
            c.strokeStyle = `rgba(125, 211, 252, ${alpha * fade})`;
            c.lineWidth = width * (0.85 + energy * 0.3);
            c.shadowColor = "rgba(56, 189, 248, 0.55)";
            c.shadowBlur = 10;
            c.stroke();
          };

          strokePath(leftPts, scale * 0.085, 0.35 + energy * 0.2);
          strokePath(rightPts, scale * 0.085, 0.35 + energy * 0.2);
          strokePath(barPts, scale * 0.075, 0.32 + energy * 0.18);
        }
      }
      c.shadowBlur = 0;
      c.restore();

      // Sparse network links on front hemisphere (AI globe look)
      c.save();
      c.lineWidth = 0.6;
      for (let i = 0; i < projected.length; i++) {
        const a = projected[i];
        if (a.p.kind !== "globe" || a.z < -0.15) continue;
        if (i % 7 !== 0) continue;
        let links = 0;
        for (let j = i + 1; j < projected.length && links < 2; j++) {
          const b = projected[j];
          if (b.p.kind !== "globe") continue;
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const dist = Math.hypot(dx, dy);
          if (dist < scale * 0.22 && dist > 2) {
            const alpha = (0.08 + energy * 0.08) * Math.min(a.depth, b.depth);
            c.strokeStyle = `rgba(125, 211, 252, ${alpha})`;
            c.beginPath();
            c.moveTo(a.sx, a.sy);
            c.lineTo(b.sx, b.sy);
            c.stroke();
            links++;
          }
        }
      }
      c.restore();

      for (const item of projected) {
        const { p, sx, sy, depth, z } = item;
        const front = (z + 1.2) / 2.4; // 0 back → 1 front
        const depthFade = 0.25 + front * 0.75;

        let alpha = p.bright * depthFade;
        let color = "125, 211, 252";
        let r = p.size * depth * (0.7 + energy * 0.25);

        if (p.kind === "letter") {
          color = "240, 249, 255";
          alpha = Math.min(1, (0.62 + energy * 0.35) * depthFade);
          r = p.size * depth * (1.05 + energy * 0.28);
          // soft bloom — denser smaller dots read smoother
          const g = c.createRadialGradient(sx, sy, 0, sx, sy, r * 2.6);
          g.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
          g.addColorStop(0.45, `rgba(56, 189, 248, ${alpha * 0.32})`);
          g.addColorStop(1, "rgba(56, 189, 248, 0)");
          c.fillStyle = g;
          c.beginPath();
          c.arc(sx, sy, r * 2.6, 0, Math.PI * 2);
          c.fill();
        } else if (p.kind === "globe") {
          color = front > 0.55 ? "186, 230, 253" : "56, 189, 248";
          alpha *= 0.5 + energy * 0.32;
          r *= 0.72;
        } else if (p.kind === "ring") {
          color = "125, 211, 252";
          alpha *= 0.42 + energy * 0.22;
          r *= 0.62;
        } else {
          alpha *= 0.32;
          r *= 0.5;
        }

        c.beginPath();
        c.fillStyle = `rgba(${color}, ${Math.min(1, alpha)})`;
        c.arc(sx, sy, Math.max(0.4, r), 0, Math.PI * 2);
        c.fill();
      }

      // Thin glass rim
      c.beginPath();
      c.strokeStyle = `rgba(186, 230, 253, ${0.12 + energy * 0.1})`;
      c.lineWidth = 1.2;
      c.arc(cx, cy, scale * 1.05, 0, Math.PI * 2);
      c.stroke();

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
      className={`relative mx-auto flex aspect-square w-full max-w-[min(74vw,360px)] items-center justify-center ${className}`}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.18),_transparent_70%)] blur-2xl"
        style={{ opacity: mode === "idle" ? 0.55 : 0.9 }}
      />
      <div
        className="pointer-events-none absolute bottom-[4%] left-1/2 h-[16%] w-[56%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.38),_transparent_72%)] blur-md"
        style={{ opacity: mode === "idle" ? 0.5 : 0.85 }}
      />
      <canvas ref={canvasRef} className="relative z-10 h-full w-full" />
    </div>
  );
}
