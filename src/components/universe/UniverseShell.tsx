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
 * Mobile-first shell: sidebar/right panel only from lg/xl.
 * Below that, hamburger drawers only — never crush the galaxy.
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

  // Lock body scroll while drawer open
  useEffect(() => {
    if (drawer === "none") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  const { data: overviewLive } = useUniverseOverview();
  const badges = overviewLive?.badges ?? { notifications: 0, messages: 0, tasks: 0 };

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#030712] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(56,189,248,0.1), transparent 55%), linear-gradient(180deg,#030712,#061018 50%,#030712)",
        }}
      />

      {/* Top bar — always on small/medium; desktop keeps title in column */}
      <header className="relative z-30 flex shrink-0 items-center justify-between gap-2 border-b border-sky-500/15 bg-[#060b14]/95 px-3 py-2.5 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          className="rounded-lg border border-white/10 p-2.5 text-sky-300 touch-manipulation"
          onClick={() => setDrawer((d) => (d === "nav" ? "none" : "nav"))}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xs font-semibold tracking-[0.16em] text-sky-200">
            ALPHA UNIVERSE
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-white/10 p-2.5 text-slate-400 touch-manipulation"
          onClick={() => setDrawer((d) => (d === "right" ? "none" : "right"))}
          aria-label="Open activity"
        >
          <Activity size={16} />
        </button>
      </header>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Desktop sidebar only ≥1024px */}
        <div className="hidden shrink-0 lg:flex">
          <UniverseSidebar email={email} />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative hidden shrink-0 items-center justify-between border-b border-sky-500/10 px-4 py-3 lg:flex">
            <div className="w-24" />
            <div className="min-w-0 text-center">
              <h1 className="text-sm font-bold uppercase tracking-[0.28em] text-sky-100">
                Alpha Universe
              </h1>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Connected skills · live data
              </p>
            </div>
            <div className="flex items-center gap-3">
              <LiveClock />
              <Link
                href="/universe/settings"
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-sky-300"
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
              <div className="shrink-0 border-t border-white/5 bg-[#030712]/90 px-3 py-2 backdrop-blur-xl">
                <CommandBar />
              </div>
            ) : null}
          </main>
        </div>

        <div className="hidden min-w-0 shrink-0 xl:flex">
          <UniverseRightPanel />
        </div>
      </div>

      {/* Nav drawer — phones + tablets */}
      {drawer === "nav" ? (
        <div className="fixed inset-0 z-[60] flex lg:hidden">
          <div className="relative h-full w-[min(100%,280px)] shadow-2xl">
            <button
              type="button"
              className="absolute right-2 top-2 z-10 rounded-lg border border-white/10 bg-black/40 p-2 text-slate-300"
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
            className="flex-1 bg-black/65"
            aria-label="Close"
            onClick={() => setDrawer("none")}
          />
        </div>
      ) : null}

      {drawer === "right" ? (
        <div className="fixed inset-0 z-[60] flex justify-end xl:hidden">
          <button
            type="button"
            className="flex-1 bg-black/65"
            aria-label="Close panel"
            onClick={() => setDrawer("none")}
          />
          <div className="h-full w-[min(100%,320px)] shadow-2xl">
            <UniverseRightPanel />
          </div>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-sky-500/15 bg-[#060b14]/95 backdrop-blur-xl lg:hidden"
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
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] uppercase tracking-wider touch-manipulation",
                active ? "text-sky-300" : "text-slate-500"
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
