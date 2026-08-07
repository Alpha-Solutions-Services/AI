"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  BookOpen,
  Brain,
  Headphones,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Settings,
  Truck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUniverseOverview } from "@/components/universe/UniverseRightPanel";

const NAV = [
  { href: "/universe", label: "Galaxy", icon: LayoutGrid, exact: true },
  { href: "/universe/dispatch", label: "Dispatch", icon: Truck },
  { href: "/universe/intelligence", label: "Intelligence", icon: Brain },
  { href: "/universe/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/support", label: "Support", icon: Headphones },
  { href: "/universe#activity", label: "Activity", icon: Activity },
  { href: "/universe/settings", label: "Settings", icon: Settings },
  { href: "/", label: "Chat", icon: MessageSquare },
];

export function UniverseSidebar({
  email,
  collapsed,
  onNavigate,
}: {
  email?: string | null;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useUniverseOverview();
  const health = data?.health;
  const badges = data?.badges;

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={clsx(
        "flex h-full w-[min(100%,280px)] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:w-[220px]",
        collapsed ? "lg:w-[72px] lg:px-2" : "px-3"
      )}
    >
      <div className={clsx("py-4", collapsed && "px-0 text-center")}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] text-sm font-bold text-white">
            A
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Alpha Universe</p>
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={clsx(
          "mb-3 flex w-full items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-left",
          collapsed && "justify-center"
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-dim)] text-[11px] font-semibold text-[var(--color-accent-2)]">
          {(email?.[0] || "A").toUpperCase()}
        </span>
        {!collapsed ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs">
              {email?.split("@")[0] || "Staff"}
            </span>
            <span className="block text-[10px] text-[var(--color-muted)]">
              Staff
            </span>
          </span>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === "/universe"
            : item.href === "/support"
              ? pathname.startsWith("/support")
              : item.href === "/"
                ? pathname === "/"
                : item.href.startsWith("/universe/") &&
                  (pathname === item.href ||
                    pathname.startsWith(`${item.href}/`));
          const count =
            item.href.includes("activity") && badges
              ? badges.notifications
              : 0;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              title={item.label}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition",
                collapsed && "justify-center px-0",
                active
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-2)]"
                  : "text-[var(--color-muted)] hover:bg-white/[0.04] hover:text-[var(--color-text)]"
              )}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed ? (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {count > 0 ? (
                    <span className="rounded-full bg-[var(--color-accent-dim)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-accent-2)]">
                      {count}
                    </span>
                  ) : null}
                </>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {!collapsed && health ? (
        <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
            System
          </p>
          <p className="mt-1 text-xl font-semibold text-emerald-400">
            {health.percent.toFixed(0)}%
          </p>
          <p className="text-[11px] text-[var(--color-muted)]">{health.label}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void signOut()}
        className={clsx(
          "mb-3 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-[var(--color-muted)] hover:bg-white/[0.04] hover:text-[var(--color-text)]",
          collapsed && "justify-center"
        )}
        aria-label="Sign out"
      >
        <LogOut size={16} />
        {!collapsed ? <span>Sign out</span> : null}
      </button>
    </aside>
  );
}
