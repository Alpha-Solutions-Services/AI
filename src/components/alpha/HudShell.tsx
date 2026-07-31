"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  CheckCircle2,
  LayoutDashboard,
  LogOut,
  Orbit,
  Settings,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";

const BOTTOM_NAV = [
  { href: "/", label: "Chat", icon: LayoutDashboard },
  { href: "/universe", label: "Universe", icon: Orbit },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-right leading-tight">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-chrome)]">
        {now
          ? now.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })
          : "—"}
      </p>
      <p className="font-mono text-sm tabular-nums text-[var(--color-accent-2)]">
        {now
          ? now.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "--:--:--"}
      </p>
    </div>
  );
}

function useRealHudStatus() {
  const [docs, setDocs] = useState<number | null>(null);
  const [uptime, setUptime] = useState("00:00:00");
  const [started] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
      const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
      const ss = String(elapsed % 60).padStart(2, "0");
      setUptime(`${hh}:${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(tick);
  }, [started]);

  useEffect(() => {
    const pull = () => {
      void fetch("/api/knowledge/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j && typeof j.documents === "number") setDocs(j.documents);
        })
        .catch(() => undefined);
    };
    pull();
    const id = setInterval(pull, 60000);
    return () => clearInterval(id);
  }, []);

  return { docs, uptime };
}

export function LeftHudPanel() {
  const { docs, uptime } = useRealHudStatus();
  const links = [
    { href: "/universe", label: "Alpha Universe", blurb: "Galaxy + Dispatch" },
    { href: "/universe/dispatch", label: "Dispatch", blurb: "Live TMS loads" },
    { href: "/knowledge", label: "Knowledge", blurb: "Indexed documents" },
    { href: "/settings", label: "Settings", blurb: "Voice preferences" },
  ];

  return (
    <aside className="hud-glass flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-3.5 sm:p-4">
      <div className="flex items-center justify-between">
        <p className="hud-panel-title">Workspace</p>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
          Online
        </span>
      </div>

      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="glass-chip flex flex-col rounded-2xl px-3 py-2.5 transition hover:border-[var(--color-accent)]/35"
            >
              <span className="text-sm text-[var(--color-text)]">{l.label}</span>
              <span className="text-[11px] text-[var(--color-muted)]">{l.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div>
        <p className="hud-panel-title mb-2">Session</p>
        <div className="glass-chip space-y-2 rounded-2xl px-3 py-3 text-[12px] text-[var(--color-chrome)]">
          <p className="flex justify-between gap-2">
            <span className="text-[var(--color-muted)]">Uptime</span>
            <span className="font-mono tabular-nums">{uptime}</span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-[var(--color-muted)]">Docs indexed</span>
            <span className="font-mono tabular-nums">
              {docs != null ? docs : "—"}
            </span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-[var(--color-muted)]">Write gate</span>
            <span className="text-emerald-300">Confirm required</span>
          </p>
        </div>
      </div>
    </aside>
  );
}

export function RightHudPanel() {
  return (
    <aside className="hud-glass flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-3.5 sm:p-4">
      <div className="flex items-center justify-between">
        <p className="hud-panel-title">Mission</p>
      </div>

      <div>
        <p className="text-[12px] leading-relaxed text-[var(--color-chrome)]">
          Staff command assistant for Portal, TMS Dispatch, Learn Academy, and
          the open web. Destructive actions require confirmation.
        </p>
        <Link
          href="/universe"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent)]/35 bg-[var(--color-accent)]/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-2)] transition hover:bg-[var(--color-accent)]/20"
        >
          <Orbit size={12} /> Open Universe
        </Link>
      </div>

      <div>
        <p className="hud-panel-title mb-3">Controls</p>
        <ul className="space-y-2">
          {[
            { icon: Shield, k: "Security", v: "Staff allowlist" },
            { icon: CheckCircle2, k: "Writes", v: "Confirm first" },
            { icon: BookOpen, k: "Memory", v: "Knowledge index" },
          ].map((s) => (
            <li
              key={s.k}
              className="glass-chip flex items-center justify-between rounded-2xl px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
                <s.icon size={12} className="text-[var(--color-accent)]" />
                {s.k}
              </span>
              <span className="text-xs text-[var(--color-accent-2)]">{s.v}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export function HudShell({
  children,
  email,
  centerOnly,
}: {
  children: ReactNode;
  email?: string | null;
  centerOnly?: boolean;
}) {
  const pathname = usePathname();
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
      <div aria-hidden className="alpha-ambient pointer-events-none absolute inset-0" />
      <div aria-hidden className="hud-grid pointer-events-none absolute inset-0" />
      <div aria-hidden className="hud-scanlines pointer-events-none absolute inset-0 opacity-60" />

      <header className="relative z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-[var(--color-border)] bg-[rgba(3,7,18,0.55)] px-3 py-3 backdrop-blur-2xl sm:px-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
          </span>
          <div className="hidden sm:block">
            <p className="text-[9px] uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Status
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Online
            </p>
          </div>
          {!centerOnly ? (
            <div className="flex gap-1.5 lg:hidden">
              <button
                type="button"
                onClick={() =>
                  setMobilePanel((p) => (p === "left" ? "none" : "left"))
                }
                className="glass-chip rounded-full px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--color-accent)]"
              >
                Menu
              </button>
              <button
                type="button"
                onClick={() =>
                  setMobilePanel((p) => (p === "right" ? "none" : "right"))
                }
                className="glass-chip rounded-full px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--color-accent)]"
              >
                Info
              </button>
            </div>
          ) : null}
        </div>

        <div className="text-center">
          <h1
            className="text-sm uppercase tracking-[0.2em] text-[var(--color-accent-2)] sm:text-base md:text-lg"
            style={{
              fontFamily: "var(--font-display), sans-serif",
              textShadow: "0 0 28px rgba(56,189,248,0.4)",
            }}
          >
            Alpha AI Agent
          </h1>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)] sm:text-[11px]">
            Staff command console
          </p>
          {email ? (
            <p className="mt-0.5 hidden truncate text-[10px] text-[var(--color-muted)] sm:block">
              {email}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <Link
            href="/universe"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-[var(--color-accent)]/35 bg-[var(--color-accent)]/10 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-2)] transition hover:bg-[var(--color-accent)]/20 sm:px-3 sm:text-[11px]"
          >
            <Orbit size={14} />
            <span className="hidden xs:inline sm:inline">Universe</span>
          </Link>
          <div className="hidden md:block">
            <Clock />
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="glass-chip rounded-2xl p-2.5 text-[var(--color-muted)] transition hover:text-[var(--color-accent)]"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div
        className={clsx(
          "relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-3 overflow-hidden p-2.5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:gap-3.5 sm:p-3.5 lg:pb-3.5",
          !centerOnly &&
            "lg:grid lg:grid-cols-[220px_minmax(0,1fr)_220px] xl:grid-cols-[260px_minmax(0,1fr)_260px] 2xl:grid-cols-[280px_minmax(0,1fr)_280px]"
        )}
      >
        {!centerOnly ? (
          <div className="hidden min-h-0 lg:block">
            <LeftHudPanel />
          </div>
        ) : null}

        <main className="hud-glass relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>

        {!centerOnly ? (
          <div className="hidden min-h-0 lg:block">
            <RightHudPanel />
          </div>
        ) : null}
      </div>

      {/* Mobile drawers above backdrop */}
      {mobilePanel !== "none" ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-black/55 backdrop-blur-sm lg:hidden"
            aria-label="Close panel"
            onClick={() => setMobilePanel("none")}
          />
          <div className="fixed inset-x-3 top-[4.5rem] z-[60] max-h-[70dvh] overflow-auto lg:hidden">
            {mobilePanel === "left" ? <LeftHudPanel /> : <RightHudPanel />}
          </div>
        </>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[rgba(3,7,18,0.7)] backdrop-blur-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Primary"
      >
        <ul className="mx-auto flex max-w-[1600px] justify-around gap-1 px-2 py-2 sm:justify-center sm:gap-2 sm:px-3">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.label} className="min-w-0 flex-1 sm:flex-none">
                <Link
                  href={item.href}
                  className={clsx(
                    "flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-center transition sm:min-w-[5.5rem]",
                    active
                      ? "glass-strong border-[var(--color-accent)]/40 text-[var(--color-accent-2)] shadow-[0_0_22px_rgba(56,189,248,0.22)]"
                      : "border-transparent text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-white/[0.04] hover:text-[var(--color-chrome)]"
                  )}
                >
                  <Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
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
