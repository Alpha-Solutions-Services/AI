"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  Bell,
  Home,
  Menu,
  Mic,
  Settings,
  X,
} from "lucide-react";
import { LiveClock } from "@/components/universe/LiveClock";
import { UniverseSidebar } from "@/components/universe/UniverseSidebar";
import { UniverseRightPanel } from "@/components/universe/UniverseRightPanel";
import { CommandBar } from "@/components/universe/CommandBar";
import { useUniverseOverview } from "@/components/universe/UniverseRightPanel";

/**
 * Universe shell — same professional tokens as staff console.
 * Sidebar from lg; drawers + bottom nav on smaller screens.
 */
export function UniverseShell({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState<"none" | "nav" | "right">("none");
  const isGalaxyHome = pathname === "/universe";

  useEffect(() => {
    setDrawer("none");
  }, [pathname]);

  useEffect(() => {
    if (drawer === "none") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  useUniverseOverview();

  return (
    <div className="aurora relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="aurora-bg" aria-hidden />
      <header className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 lg:hidden">
        <button
          type="button"
          className="rounded-lg border border-[var(--color-border)] p-2.5 text-[var(--color-accent-2)]"
          onClick={() => setDrawer((d) => (d === "nav" ? "none" : "nav"))}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold tracking-tight">
            Alpha Universe
          </p>
          <p className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--color-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live modules
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-[var(--color-border)] p-2.5 text-[var(--color-muted)]"
          onClick={() => setDrawer((d) => (d === "right" ? "none" : "right"))}
          aria-label="Open activity"
        >
          <Activity size={16} />
        </button>
      </header>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="hidden shrink-0 lg:flex">
          <UniverseSidebar email={email} />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative hidden h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 lg:flex">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs text-[var(--color-muted)]">Live</span>
            </div>
            <div className="min-w-0 text-center">
              <h1 className="text-sm font-semibold tracking-tight">
                Alpha Universe
              </h1>
              <p className="text-[11px] text-[var(--color-muted)]">
                Skills · modules · live data
              </p>
            </div>
            <div className="flex items-center gap-3">
              <LiveClock />
              <Link
                href="/universe/settings"
                className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-muted)] hover:text-[var(--color-accent-2)]"
                aria-label="Settings"
              >
                <Settings size={16} />
              </Link>
            </div>
          </div>

          <main
            className={clsx(
              "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              "pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
            )}
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
              {children}
            </div>
            {!isGalaxyHome ? (
              <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                <CommandBar />
              </div>
            ) : null}
          </main>
        </div>

        <div className="hidden min-w-0 shrink-0 xl:flex">
          <UniverseRightPanel />
        </div>
      </div>

      {drawer === "nav" ? (
        <div className="fixed inset-0 z-[60] flex lg:hidden">
          <div className="relative h-full w-[min(100%,280px)] shadow-2xl">
            <button
              type="button"
              className="absolute right-2 top-2 z-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-[var(--color-muted)]"
              aria-label="Close menu"
              onClick={() => setDrawer("none")}
            >
              <X size={16} />
            </button>
            <UniverseSidebar
              email={email}
              onNavigate={() => setDrawer("none")}
            />
          </div>
          <button
            type="button"
            className="flex-1 bg-black/60"
            aria-label="Close"
            onClick={() => setDrawer("none")}
          />
        </div>
      ) : null}

      {drawer === "right" ? (
        <div className="fixed inset-0 z-[60] flex justify-end xl:hidden">
          <button
            type="button"
            className="flex-1 bg-black/60"
            aria-label="Close panel"
            onClick={() => setDrawer("none")}
          />
          <div className="h-full w-[min(100%,320px)] shadow-2xl">
            <UniverseRightPanel />
          </div>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-[var(--color-border)] bg-[var(--color-surface)] lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Mobile"
      >
        {[
          { href: "/universe", label: "Galaxy", icon: Home },
          { href: "/universe/dispatch", label: "Dispatch", icon: Activity },
          { href: "/", label: "Chat", icon: Mic },
          { href: "/universe", label: "More", icon: Bell, openRight: true },
        ].map((t) => {
          const Icon = t.icon;
          const active =
            t.href === "/universe"
              ? pathname === "/universe" && !("openRight" in t && t.openRight)
              : pathname.startsWith(t.href) && t.href !== "/";
          return (
            <Link
              key={t.label}
              href={t.href}
              onClick={(e) => {
                if ("openRight" in t && t.openRight) {
                  e.preventDefault();
                  setDrawer("right");
                }
              }}
              className={clsx(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium",
                active
                  ? "text-[var(--color-accent-2)]"
                  : "text-[var(--color-muted)]"
              )}
            >
              <Icon size={18} />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function UniverseShellClient({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null;
}) {
  return <UniverseShell email={email}>{children}</UniverseShell>;
}
