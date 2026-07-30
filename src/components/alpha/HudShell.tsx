"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  Briefcase,
  CheckCircle2,
  Code2,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MessageSquare,
  Network,
  Puzzle,
  Rocket,
  Settings,
  Shield,
  Star,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";

const BOTTOM_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, match: ["/"] },
  { href: "/?view=tasks", label: "Tasks", icon: ListTodo, view: "tasks" },
  { href: "/?view=projects", label: "Projects", icon: FolderKanban, view: "projects" },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  {
    href: "/?view=integrations",
    label: "Integrations",
    icon: Network,
    view: "integrations",
  },
  { href: "/?view=analytics", label: "Analytics", icon: BarChart3, view: "analytics" },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-right leading-tight">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-chrome)]">
        {now.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      <p className="font-mono text-sm text-[var(--color-accent-2)] tabular-nums">
        {now.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </p>
    </div>
  );
}

function MetricRing({
  label,
  value,
  gold,
}: {
  label: string;
  value: number;
  gold?: boolean;
}) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c - (clamped / 100) * c;
  const stroke = gold ? "var(--color-gold)" : "var(--color-accent)";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="52" height="52" className="-rotate-90">
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke="rgba(0,191,255,0.12)"
          strokeWidth="3"
        />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${stroke})` }}
        />
      </svg>
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </p>
      <p className="font-mono text-xs tabular-nums text-[var(--color-text)]">
        {Math.round(clamped)}%
      </p>
    </div>
  );
}

function useLiveMetrics() {
  const [cpu, setCpu] = useState(24);
  const [mem, setMem] = useState(42);
  const [net, setNet] = useState(71);
  const [tasks, setTasks] = useState(1287);
  const [success, setSuccess] = useState(98.6);
  const [latency, setLatency] = useState(0.83);
  const [trend, setTrend] = useState<number[]>(() =>
    Array.from({ length: 24 }, () => 18 + Math.random() * 14)
  );
  const [procPulse, setProcPulse] = useState(0);
  const [docs, setDocs] = useState<number | null>(null);
  const [uptime, setUptime] = useState("00:00:00");
  const startRef = useRef(Date.now());

  useEffect(() => {
    const tick = setInterval(() => {
      setCpu((v) => Math.max(12, Math.min(68, v + (Math.random() - 0.48) * 6)));
      setMem((v) => Math.max(28, Math.min(78, v + (Math.random() - 0.5) * 4)));
      setNet((v) => Math.max(40, Math.min(96, v + (Math.random() - 0.45) * 8)));
      setLatency((v) =>
        Math.max(0.42, Math.min(1.6, +(v + (Math.random() - 0.5) * 0.12).toFixed(2)))
      );
      setSuccess((v) =>
        Math.max(97.2, Math.min(99.4, +(v + (Math.random() - 0.5) * 0.08).toFixed(1)))
      );
      if (Math.random() > 0.7) setTasks((t) => t + 1);
      setTrend((arr) => [...arr.slice(1), 12 + Math.random() * 22]);
      setProcPulse((p) => p + 1);
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
      const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
      const ss = String(elapsed % 60).padStart(2, "0");
      setUptime(`${hh}:${mm}:${ss}`);
    }, 1600);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    void fetch("/api/knowledge/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && typeof j.documents === "number") setDocs(j.documents);
      })
      .catch(() => undefined);
    const id = setInterval(() => {
      void fetch("/api/knowledge/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j && typeof j.documents === "number") setDocs(j.documents);
        })
        .catch(() => undefined);
    }, 45000);
    return () => clearInterval(id);
  }, []);

  return { cpu, mem, net, tasks, success, latency, trend, procPulse, docs, uptime };
}

export function LeftHudPanel() {
  const { cpu, mem, net, procPulse, docs, uptime } = useLiveMetrics();
  const caps = [
    { icon: Brain, title: "Intelligent", blurb: "Deep analysis & planning" },
    { icon: ListTodo, title: "Plans smarter", blurb: "Breaks work into steps" },
    { icon: Rocket, title: "Executes faster", blurb: "Tools across Alpha apps" },
    { icon: Puzzle, title: "Adapts & learns", blurb: "Context from your stack" },
  ];
  const procs = [
    { name: "Portal CRM sync", lag: 0 },
    { name: "TMS freight queue", lag: 1 },
    { name: "Learn Dispatch academy", lag: 2 },
    { name: "Knowledge crawl", lag: 3 },
    { name: "Web intelligence", lag: 4 },
  ];

  return (
    <aside className="hud-glass flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <p className="hud-panel-title">Live systems</p>
        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      <div>
        <p className="hud-panel-title mb-3">AI Capabilities</p>
        <ul className="space-y-2.5">
          {caps.map((cap) => (
            <li key={cap.title} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--color-border)] bg-[var(--color-accent-dim)] text-[var(--color-accent)]">
                <cap.icon size={16} />
              </div>
              <div>
                <p className="text-sm text-[var(--color-text)]">{cap.title}</p>
                <p className="text-[11px] text-[var(--color-muted)]">{cap.blurb}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="hud-panel-title mb-3">System Metrics</p>
        <div className="flex justify-between gap-1 px-1">
          <MetricRing label="CPU" value={cpu} />
          <MetricRing label="Memory" value={mem} />
          <MetricRing label="Network" value={net} gold />
        </div>
        <p className="mt-2 font-mono text-[10px] text-[var(--color-muted)]">
          Session uptime {uptime}
          {docs != null ? ` · ${docs} docs indexed` : ""}
        </p>
      </div>

      <div>
        <p className="hud-panel-title mb-3">Active Processes</p>
        <ul className="space-y-2">
          {procs.map((p) => {
            const active = (procPulse + p.lag) % 5 !== 0;
            return (
              <li
                key={p.name}
                className="flex items-center gap-2 border border-[var(--color-border)]/60 bg-black/20 px-2.5 py-2 text-[11px] text-[var(--color-chrome)]"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    active
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : "bg-[var(--color-gold)] shadow-[0_0_8px_#ffd54f]"
                  }`}
                />
                <span className="truncate">{p.name}</span>
                <span
                  className={`ml-auto text-[9px] uppercase tracking-wider ${
                    active ? "text-emerald-400/90" : "text-[var(--color-gold)]"
                  }`}
                >
                  {active ? "Running" : "Sync"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

export function RightHudPanel() {
  const { tasks, success, latency, trend } = useLiveMetrics();
  const directives = [
    { icon: Shield, label: "Secure by default" },
    { icon: Briefcase, label: "Business focused" },
    { icon: Code2, label: "Code like a pro" },
    { icon: Star, label: "Communicate clearly" },
  ];

  const points = trend
    .map((y, i) => {
      const x = (i / (trend.length - 1)) * 120;
      const py = 36 - y;
      return `${x},${py}`;
    })
    .join(" ");
  const area = `0,40 ${points} 120,40`;

  return (
    <aside className="hud-glass flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <p className="hud-panel-title">Mission feed</p>
        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Online
        </span>
      </div>

      <div>
        <p className="hud-panel-title mb-2">Mission Objective</p>
        <p className="text-[12px] leading-relaxed text-[var(--color-chrome)]">
          Help Alpha Solutions staff think, plan, and execute across Portal, TMS,
          Learn Dispatch, and the open web — with confirm-before-write control.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 border border-[var(--color-gold)]/30 bg-[var(--color-gold-dim)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
          <Zap size={10} /> J.A.R.V.I.S. Mode
        </p>
      </div>

      <div>
        <p className="hud-panel-title mb-3">Core Directives</p>
        <ul className="space-y-2">
          {directives.map((d) => (
            <li
              key={d.label}
              className="flex items-center gap-2.5 border border-[var(--color-border)]/70 px-2.5 py-2 text-xs text-[var(--color-text)]"
            >
              <d.icon size={14} className="text-[var(--color-accent)]" />
              {d.label}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="hud-panel-title mb-3">AI Agent Status</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: "Tasks", v: tasks.toLocaleString() },
            { k: "Success", v: `${success.toFixed(1)}%` },
            { k: "Latency", v: `${latency.toFixed(2)}s` },
          ].map((s) => (
            <div
              key={s.k}
              className="border border-[var(--color-border)] bg-black/25 px-2 py-2 text-center"
            >
              <p className="font-mono text-sm tabular-nums text-[var(--color-text)] sm:text-base">
                {s.v}
              </p>
              <p className="mt-0.5 text-[9px] uppercase tracking-wider text-[var(--color-muted)]">
                {s.k}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {[
            { k: "Ops ready", v: "Online", icon: Activity },
            { k: "Voice", v: "Live talk", icon: MessageSquare },
            { k: "Write gate", v: "Confirm", icon: CheckCircle2 },
          ].map((s) => (
            <div
              key={s.k}
              className="flex items-center justify-between border border-[var(--color-border)] bg-black/25 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
                <s.icon size={12} className="text-[var(--color-accent)]" />
                {s.k}
              </span>
              <span className="font-mono text-xs text-[var(--color-accent-2)]">
                {s.v}
              </span>
            </div>
          ))}
        </div>
        <svg
          className="mt-3 h-10 w-full text-[var(--color-accent)]"
          viewBox="0 0 120 40"
          preserveAspectRatio="none"
          aria-hidden
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            points={points}
            opacity="0.9"
            className="transition-all duration-500"
          />
          <polyline fill="url(#alphaTrend)" stroke="none" points={area} opacity="0.2" />
          <defs>
            <linearGradient id="alphaTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00BFFF" />
              <stop offset="100%" stopColor="#00BFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </aside>
  );
}

export function HudShell({
  children,
  email,
  centerOnly,
}: {
  children: React.ReactNode;
  email?: string | null;
  /** Hide side panels (knowledge/settings pages) */
  centerOnly?: boolean;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const view = search.get("view");
  const router = useRouter();
  const [mobilePanel, setMobilePanel] = useState<"none" | "left" | "right">(
    "none"
  );

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,191,255,0.1),_transparent_55%),linear-gradient(180deg,#050a12_0%,#071018_100%)]"
      />
      <div aria-hidden className="hud-grid pointer-events-none absolute inset-0 opacity-40" />
      <div aria-hidden className="hud-scanlines pointer-events-none absolute inset-0" />

      {/* Top bar */}
      <header className="relative z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-[var(--color-border)] bg-[#050a12]/80 px-3 py-2.5 backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          </span>
          <div className="hidden sm:block">
            <p className="text-[9px] uppercase tracking-[0.24em] text-[var(--color-muted)]">
              System status
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Online
            </p>
          </div>
          {!centerOnly ? (
            <div className="flex gap-1 lg:hidden">
              <button
                type="button"
                onClick={() =>
                  setMobilePanel((p) => (p === "left" ? "none" : "left"))
                }
                className="border border-[var(--color-border)] px-2 py-1 text-[9px] uppercase tracking-wider text-[var(--color-accent)]"
              >
                Caps
              </button>
              <button
                type="button"
                onClick={() =>
                  setMobilePanel((p) => (p === "right" ? "none" : "right"))
                }
                className="border border-[var(--color-border)] px-2 py-1 text-[9px] uppercase tracking-wider text-[var(--color-accent)]"
              >
                Mission
              </button>
            </div>
          ) : null}
        </div>

        <div className="text-center">
          <h1
            className="text-sm uppercase tracking-[0.18em] text-[var(--color-accent-2)] sm:text-base md:text-lg"
            style={{
              fontFamily: "var(--font-display), sans-serif",
              textShadow: "0 0 24px rgba(0,191,255,0.45)",
            }}
          >
            Alpha AI Agent
          </h1>
          <p className="mt-0.5 text-[8px] uppercase tracking-[0.28em] text-[var(--color-gold)] sm:text-[9px]">
            Think · Plan · Execute · Deliver
          </p>
          {email ? (
            <p className="mt-0.5 hidden truncate text-[10px] text-[var(--color-muted)] sm:block">
              {email}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <div className="hidden md:block">
            <Clock />
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="border border-[var(--color-border)] p-2 text-[var(--color-muted)] hover:text-[var(--color-accent)]"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div
        className={clsx(
          "relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-2 overflow-hidden p-2 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:gap-3 sm:p-3 lg:pb-3",
          !centerOnly &&
            "lg:grid lg:grid-cols-[220px_minmax(0,1fr)_220px] xl:grid-cols-[260px_minmax(0,1fr)_260px] 2xl:grid-cols-[280px_minmax(0,1fr)_280px]"
        )}
      >
        {!centerOnly ? (
          <>
            <div className="hidden min-h-0 lg:block">
              <LeftHudPanel />
            </div>
            {mobilePanel === "left" ? (
              <div className="fixed inset-x-3 top-[4.5rem] z-40 max-h-[70dvh] overflow-auto lg:hidden">
                <LeftHudPanel />
              </div>
            ) : null}
          </>
        ) : null}

        <main className="hud-glass relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>

        {!centerOnly ? (
          <>
            <div className="hidden min-h-0 lg:block">
              <RightHudPanel />
            </div>
            {mobilePanel === "right" ? (
              <div className="fixed inset-x-3 top-[4.5rem] z-40 max-h-[70dvh] overflow-auto lg:hidden">
                <RightHudPanel />
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {mobilePanel !== "none" ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Close panel"
          onClick={() => setMobilePanel("none")}
        />
      ) : null}

      {/* Bottom dock */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[#050a12]/95 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Primary"
      >
        <ul className="mx-auto flex max-w-[1600px] gap-0.5 overflow-x-auto px-1 py-1.5 sm:justify-center sm:gap-1 sm:px-3">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.view
              ? pathname === "/" && view === item.view
              : item.href === "/knowledge"
                ? pathname.startsWith("/knowledge")
                : item.href === "/settings"
                  ? pathname.startsWith("/settings")
                  : pathname === "/" && !view;
            return (
              <li key={item.label} className="min-w-[4.5rem] flex-1 sm:min-w-0 sm:flex-none">
                <Link
                  href={item.href}
                  className={clsx(
                    "flex flex-col items-center gap-1 border px-1.5 py-2 text-center transition sm:min-w-[5.5rem]",
                    active
                      ? "border-[var(--color-accent)]/50 bg-[var(--color-accent-dim)] text-[var(--color-accent-2)] shadow-[0_0_16px_rgba(0,191,255,0.25)]"
                      : "border-transparent text-[var(--color-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-chrome)]"
                  )}
                >
                  <Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
                  <span className="text-[8px] font-semibold uppercase tracking-[0.12em] sm:text-[9px]">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
