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
} from "lucide-react";
import { LiveClock } from "@/components/universe/LiveClock";
import { UniverseSidebar } from "@/components/universe/UniverseSidebar";
import { UniverseRightPanel } from "@/components/universe/UniverseRightPanel";
import { CommandBar } from "@/components/universe/CommandBar";
import { useUniverseOverview } from "@/components/universe/UniverseRightPanel";

export function UniverseShell({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState<"none" | "nav" | "right">("none");
  const [iconSidebar, setIconSidebar] = useState(false);
  const isGalaxyHome = pathname === "/universe";

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (max-width: 1279px)");
    const apply = () => setIconSidebar(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    setDrawer("none");
  }, [pathname]);

  const { data: overviewLive } = useUniverseOverview();
  const badges = overviewLive?.badges ?? { notifications: 0, messages: 0, tasks: 0 };

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#030712] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(56,189,248,0.1), transparent 55%), radial-gradient(ellipse 40% 30% at 90% 80%, rgba(251,191,36,0.06), transparent), linear-gradient(180deg,#030712,#061018 50%,#030712)",
        }}
      />

      {/* Mobile top bar */}
      <header className="relative z-30 flex items-center justify-between border-b border-sky-500/15 bg-[#060b14]/90 px-3 py-2 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          className="rounded-lg border border-white/10 p-2 text-sky-300"
          onClick={() => setDrawer((d) => (d === "nav" ? "none" : "nav"))}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.16em] text-sky-200">
            ALPHA UNIVERSE
          </p>
        </div>
        <div className="flex gap-1">
          <Link
            href="/universe#notifications"
            className="relative rounded-lg border border-white/10 p-2 text-slate-400"
          >
            <Bell size={16} />
            <span className="absolute -right-0.5 -top-0.5 rounded-full bg-sky-500 px-1 text-[8px] text-white">
              {badges.notifications}
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg border border-white/10 p-2 text-slate-400"
            onClick={() => setDrawer((d) => (d === "right" ? "none" : "right"))}
            aria-label="Open activity"
          >
            <Activity size={16} />
          </button>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* Desktop / tablet sidebar */}
        <div className="hidden md:flex">
          <UniverseSidebar email={email} collapsed={iconSidebar} />
        </div>

        {/* Mobile nav drawer */}
        {drawer === "nav" ? (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <UniverseSidebar
              email={email}
              onNavigate={() => setDrawer("none")}
            />
            <button
              type="button"
              className="flex-1 bg-black/60"
              aria-label="Close"
              onClick={() => setDrawer("none")}
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Desktop top bar */}
          <div className="relative hidden items-center justify-between border-b border-sky-500/10 px-4 py-3 lg:flex">
            <div className="w-28" />
            <div className="text-center">
              <h1 className="text-sm font-bold uppercase tracking-[0.28em] text-sky-100 sm:text-base">
                Alpha Universe
              </h1>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Everything is connected. Everything is intelligent.
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

          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            {children}
            {!isGalaxyHome ? (
              <div className="shrink-0 border-t border-white/5 bg-[#030712]/80 px-3 py-2 backdrop-blur-xl">
                <CommandBar />
              </div>
            ) : null}
          </main>
        </div>

        <div className="hidden min-w-0 xl:flex">
          <UniverseRightPanel />
        </div>

        {drawer === "right" ? (
          <div className="fixed inset-0 z-40 flex justify-end xl:hidden">
            <button
              type="button"
              className="flex-1 bg-black/60"
              aria-label="Close panel"
              onClick={() => setDrawer("none")}
            />
            <div className="h-full w-[min(100%,320px)]">
              <UniverseRightPanel />
            </div>
          </div>
        ) : null}
      </div>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-sky-500/15 bg-[#060b14]/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Mobile"
      >
        {[
          { href: "/universe", label: "Home", icon: Home, hash: null as string | null },
          { href: "/universe", label: "Voice", icon: Mic, hash: "voice" },
          {
            href: "/universe",
            label: "Alerts",
            icon: Bell,
            hash: "notifications",
          },
          {
            href: "/universe",
            label: "Activity",
            icon: Activity,
            hash: "activity",
          },
        ].map((t) => {
          const Icon = t.icon;
          const active = t.label === "Home" && pathname === "/universe" && !t.hash;
          return (
            <Link
              key={t.label}
              href={t.hash ? `${t.href}#${t.hash}` : t.href}
              onClick={(e) => {
                if (t.hash === "voice") {
                  e.preventDefault();
                  document.getElementById("voice")?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  (
                    document.querySelector(
                      "#voice input"
                    ) as HTMLInputElement | null
                  )?.focus();
                } else if (t.hash === "activity" || t.hash === "notifications") {
                  e.preventDefault();
                  setDrawer("right");
                }
              }}
              className={clsx(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[9px] uppercase tracking-wider touch-manipulation",
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

/** Client wrapper so layout can pass email from server */
export function UniverseShellClient({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null;
}) {
  return <UniverseShell email={email}>{children}</UniverseShell>;
}
