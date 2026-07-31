"use client";

/** Stage 1 placeholder — Stage 3 swaps real BFF-backed module shells via planets.config. */
export default function PlanetPlaceholder() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-center text-slate-300">
      <p className="text-sm uppercase tracking-[0.2em] text-sky-300/80">
        Module shell
      </p>
      <p className="max-w-sm text-sm text-slate-400">
        Coming online — enable this planet in planets.config and attach a BFF
        module when tools/env are ready.
      </p>
    </div>
  );
}
