"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Loader2, RefreshCw } from "lucide-react";

type Row = Record<string, unknown>;

export default function LearnModule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [students, setStudents] = useState<Row[]>([]);
  const [certificates, setCertificates] = useState<Row[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/universe/learn");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setMetrics(json.metrics || {});
      setStudents(Array.isArray(json.students) ? json.students : []);
      setCertificates(Array.isArray(json.certificates) ? json.certificates : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load academy");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-300">Live Learn Dispatch academy</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-violet-300"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </div>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {[
          ["Students", metrics.students],
          ["Certificates", metrics.certificates],
          ["Live sessions", metrics.liveSessions],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-violet-400/20 bg-violet-500/5 px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className="font-mono text-lg text-violet-100">{value ?? 0}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10">
        <p className="bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500">
          Students
        </p>
        <ul className="divide-y divide-white/5">
          {students.length === 0 && !loading ? (
            <li className="px-3 py-4 text-center text-sm text-slate-500">
              No students
            </li>
          ) : null}
          {students.map((s) => (
            <li
              key={String(s.id)}
              className="flex items-center gap-2 px-3 py-2.5 text-[12px]"
            >
              <GraduationCap size={12} className="text-violet-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-slate-100">
                  {String(s.full_name || s.email || "—")}
                </p>
                <p className="truncate text-[10px] text-slate-500">
                  {String(s.email || "")}
                  {s.enrollment_status
                    ? ` · ${String(s.enrollment_status)}`
                    : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 p-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Recent certificates
        </p>
        <ul className="mt-2 space-y-1.5 text-[12px] text-slate-300">
          {certificates.slice(0, 8).map((c) => (
            <li key={String(c.id)} className="truncate">
              {String(c.student_name || c.student_email || c.code || c.id)}
            </li>
          ))}
          {!certificates.length ? (
            <li className="text-slate-500">No certificates yet</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
