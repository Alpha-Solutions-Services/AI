"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  Bell,
  Brain,
  Calendar,
  ChevronDown,
  FileText,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Mic,
  ListTodo,
} from "lucide-react";
import { MOCK_BADGE_COUNTS, MOCK_UNIVERSE_HEALTH } from "@/lib/universe/types";
import { Sparkline } from "@/components/universe/UniverseCharts";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/universe", label: "Universe", icon: LayoutGrid, exact: true },
  { href: "/universe/intelligence", label: "AI Intelligence", icon: Brain },
  {
    href: "/universe#notifications",
    label: "Notifications",
    icon: Bell,
    badge: "notifications" as const,
  },
  {
    href: "/universe#messages",
    label: "Messages",
    icon: MessageSquare,
    badge: "messages" as const,
  },
  {
    href: "/universe#tasks",
    label: "Tasks",
    icon: ListTodo,
    badge: "tasks" as const,
  },
  { href: "/universe#calendar", label: "Calendar", icon: Calendar },
  { href: "/universe#activity", label: "Activity Feed", icon: Activity },
  { href: "/universe/knowledge", label: "Documents", icon: FileText },
  { href: "/universe#voice", label: "Voice Command", icon: Mic },
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
  const badges = MOCK_BADGE_COUNTS; // TODO: replace with live counts
  const health = MOCK_UNIVERSE_HEALTH;

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={clsx(
        "flex h-full flex-col border-r border-sky-500/15 bg-[#060b14]/95 backdrop-blur-xl",
        collapsed ? "w-[72px] px-2" : "w-[220px] px-3"
      )}
    >
      <div className={clsx("py-4", collapsed && "px-0 text-center")}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10 text-sm font-bold text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
            A
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sky-100">Alpha AI</p>
              <p className="truncate text-[9px] uppercase tracking-[0.14em] text-slate-500">
                Universe Operating System
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className={clsx(
          "mb-3 flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2 text-left",
          collapsed && "justify-center"
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/40 to-indigo-500/30 text-[11px] font-semibold text-white">
          {(email?.[0] || "A").toUpperCase()}
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-slate-100">
                {email?.split("@")[0] || "Alpha Admin"}
              </span>
              <span className="block text-[10px] text-slate-500">System Owner</span>
            </span>
            <ChevronDown size={14} className="text-slate-500" />
          </>
        ) : null}
      </button>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === "/universe"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const count = item.badge ? badges[item.badge] : 0;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              title={item.label}
              className={clsx(
                "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] transition",
                collapsed && "justify-center px-0",
                active
                  ? "bg-sky-500/15 text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.2)]"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              )}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed ? (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {count > 0 ? (
                    <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-sky-300">
                      {count}
                    </span>
                  ) : null}
                </>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {!collapsed ? (
        <div className="mb-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-400/90">
            Universe Status
          </p>
          <p className="mt-1 font-mono text-2xl text-emerald-300">
            {health.percent.toFixed(1)}%
          </p>
          <p className="text-[10px] text-slate-400">{health.label}</p>
          <Sparkline
            points={health.sparkline}
            stroke="#34d399"
            className="mt-2 h-7 w-full"
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void signOut()}
        className={clsx(
          "mb-3 flex items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] text-slate-500 hover:bg-white/[0.04] hover:text-slate-300",
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
