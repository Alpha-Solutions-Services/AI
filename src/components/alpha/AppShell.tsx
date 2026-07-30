"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LogOut, MessageSquare, Settings } from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,163,255,0.14),_transparent_50%),linear-gradient(180deg,#05080f_0%,#071018_100%)]"
      />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/alpha-logo.png"
            alt="Alpha"
            width={36}
            height={36}
            className="shrink-0 rounded-lg"
          />
          <div className="min-w-0">
            <p
              className="truncate text-lg leading-none text-[var(--color-text)] md:text-xl"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Alpha
            </p>
            <p className="truncate text-[11px] text-[var(--color-muted)]">
              Staff Jarvis · {email || "signed in"}
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm ${
                  active
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => void signOut()}
            className="ml-1 flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </nav>

        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-1.5 px-2 py-2 text-[var(--color-muted)] md:hidden"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </main>

      <MobileBottomNav items={nav} />
    </div>
  );
}
