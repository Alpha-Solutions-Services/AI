"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  Headphones,
  LayoutDashboard,
  LogOut,
  Orbit,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Chat", icon: LayoutDashboard },
  { href: "/universe", label: "Universe", icon: Orbit },
  { href: "/support", label: "Support", icon: Headphones },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SideNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Primary">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = navActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
              active
                ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-2)]"
                : "text-[var(--color-muted)] hover:bg-white/[0.04] hover:text-[var(--color-text)]"
            )}
          >
            <Icon size={18} strokeWidth={active ? 2.2 : 1.75} />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function LeftHudPanel() {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="hud-panel-title">Workspace</p>
      </div>
      <ul className="space-y-1 p-3 text-sm">
        {[
          { href: "/universe", label: "Universe", blurb: "Galaxy + modules" },
          { href: "/universe/dispatch", label: "Dispatch", blurb: "Live loads" },
          { href: "/support", label: "Support", blurb: "AFN inbox" },
          { href: "/knowledge", label: "Knowledge", blurb: "Indexed docs" },
        ].map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block rounded-lg px-3 py-2 hover:bg-white/[0.04]"
            >
              <span className="text-[var(--color-text)]">{l.label}</span>
              <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                {l.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function RightHudPanel() {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="hud-panel-title mb-3">About</p>
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        Staff assistant for Portal, TMS, Learn Academy, and support handoffs.
        Writes require confirmation.
      </p>
      <Link
        href="/universe"
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-accent-2)] hover:border-[var(--color-accent)]"
      >
        <Orbit size={14} /> Open Universe
      </Link>
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
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const pageTitle =
    NAV.find((n) => navActive(pathname, n.href))?.label || "Alpha AI";

  return (
    <div className="alpha-shell-bg flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden">
      <header className="z-40 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] text-sm font-bold text-white">
            A
          </span>
          <span className="min-w-0">
            <span
              className="block truncate text-sm font-semibold tracking-tight text-[var(--color-text)]"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Alpha AI
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="hidden sm:inline">Live · staff</span>
            </span>
          </span>
        </Link>

        <div className="mx-auto hidden text-sm text-[var(--color-muted)] md:block">
          {pageTitle}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {now ? (
            <span className="hidden text-xs tabular-nums text-[var(--color-muted)] lg:inline">
              {now.toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ) : null}
          {email ? (
            <span className="hidden max-w-[180px] truncate text-xs text-[var(--color-chrome)] xl:inline">
              {email}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
            aria-label="Sign out"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Laptop+ primary nav */}
        <aside className="hidden w-52 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] md:flex lg:w-56">
          <SideNav pathname={pathname} />
          <div className="mt-auto border-t border-[var(--color-border)] p-3 text-[11px] text-[var(--color-muted)]">
            Confirm required for writes
          </div>
        </aside>

        <div
          className={clsx(
            "flex min-h-0 min-w-0 flex-1",
            !centerOnly && "xl:grid xl:grid-cols-[minmax(0,1fr)_240px]"
          )}
        >
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-[4.25rem] md:pb-0">
            {children}
          </main>

          {!centerOnly ? (
            <div className="hidden min-h-0 border-l border-[var(--color-border)] xl:block">
              <RightHudPanel />
            </div>
          ) : null}
        </div>
      </div>

      {/* Phone-only bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Mobile"
      >
        <ul className="grid grid-cols-5 gap-0 px-1 py-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = navActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-center",
                    active
                      ? "text-[var(--color-accent-2)]"
                      : "text-[var(--color-muted)]"
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.75} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
