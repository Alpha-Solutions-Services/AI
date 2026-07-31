"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  FolderKanban,
  ListTodo,
  Network,
  Orbit,
} from "lucide-react";
import { AlphaChat } from "@/components/alpha/AlphaChat";

function StubView({
  title,
  icon: Icon,
  blurb,
}: {
  title: string;
  icon: typeof ListTodo;
  blurb: string;
}) {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="glass-chip flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--color-accent)] shadow-[var(--glow-sm)]">
        <Icon size={26} />
      </div>
      <h2
        className="text-lg uppercase tracking-[0.2em] text-[var(--color-accent-2)]"
        style={{ fontFamily: "var(--font-display), sans-serif" }}
      >
        {title}
      </h2>
      <p className="max-w-md text-sm text-[var(--color-chrome)]">{blurb}</p>
      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
        Coming soon — use chat or Universe for now
      </p>
      <Link
        href="/universe"
        className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-4 py-2.5 text-sm text-[var(--color-accent-2)]"
      >
        <Orbit size={16} /> Open Universe
      </Link>
    </div>
  );
}

function DashboardInner() {
  const view = useSearchParams().get("view");
  if (view === "tasks") {
    return (
      <StubView
        title="Tasks"
        icon={ListTodo}
        blurb="Ask Alpha to list tickets or the dispatcher queue. Dedicated task boards ship later."
      />
    );
  }
  if (view === "projects") {
    return (
      <StubView
        title="Projects"
        icon={FolderKanban}
        blurb="Search Portal CRM projects through chat, or open Portal from Universe."
      />
    );
  }
  if (view === "integrations") {
    return (
      <StubView
        title="Integrations"
        icon={Network}
        blurb="Portal · TMS · Learn Dispatch · Groq — connected via Alpha tools and env."
      />
    );
  }
  if (view === "analytics") {
    return (
      <StubView
        title="Analytics"
        icon={BarChart3}
        blurb="Live counts live in Universe overview. Deeper reports ship in a later release."
      />
    );
  }
  return <AlphaChat />;
}

export function DashboardHome() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
          Initializing Alpha…
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
