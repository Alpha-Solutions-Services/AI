"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  FolderKanban,
  ListTodo,
  Network,
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
      <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-gold)]">
        Module online · linked to Alpha tools
      </p>
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
        blurb="Ask Alpha to list tickets, enrollments, or dispatcher queue — write actions still require confirm."
      />
    );
  }
  if (view === "projects") {
    return (
      <StubView
        title="Projects"
        icon={FolderKanban}
        blurb="Search Portal CRM projects through chat, or say “open Portal admin in my browser.”"
      />
    );
  }
  if (view === "integrations") {
    return (
      <StubView
        title="Integrations"
        icon={Network}
        blurb="Portal · TMS · Learn Dispatch · Sanity · Groq · SMTP — managed via Alpha tools and env."
      />
    );
  }
  if (view === "analytics") {
    return (
      <StubView
        title="Analytics"
        icon={BarChart3}
        blurb="Live ops metrics appear in the side HUD. Deeper reports ship in a later Alpha release."
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
          Initializing Alpha core…
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
