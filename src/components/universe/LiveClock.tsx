"use client";

import { useEffect, useState } from "react";

export function LiveClock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`text-right leading-tight ${className}`}>
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
        {now.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      <p className="font-mono text-sm tabular-nums text-sky-300">
        {now.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </p>
    </div>
  );
}
