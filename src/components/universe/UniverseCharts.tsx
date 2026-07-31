"use client";

export function Sparkline({
  points,
  className = "",
  stroke = "#38bdf8",
}: {
  points: number[];
  className?: string;
  stroke?: string;
}) {
  if (!points.length) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const w = 120;
  const h = 28;
  const d = points
    .map((v, i) => {
      const x = (i / Math.max(1, points.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.75" opacity={0.9} />
    </svg>
  );
}

export function ProgressRing({
  percent,
  size = 56,
  stroke = "#38bdf8",
}: {
  percent: number;
  size?: number;
  stroke?: string;
}) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const offset = c - (p / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(56,189,248,0.12)"
        strokeWidth="4"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ filter: `drop-shadow(0 0 6px ${stroke})` }}
      />
    </svg>
  );
}
