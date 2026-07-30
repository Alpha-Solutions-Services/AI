"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LogOut, MessageSquare, Settings } from "lucide-react";
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
    <div className="relative flex min-h-screen flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,163,255,0.14),_transparent_50%),linear-gradient(180deg,#05080f_0%,#071018_100%)]"
      />
      <header className="relative z-10 flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/alpha-logo.png"
            alt="Alpha"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <div>
            <p
              className="text-xl leading-none text-[var(--color-text)]"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Alpha
            </p>
            <p className="text-[11px] text-[var(--color-muted)]">
              Staff Jarvis · {email || "signed in"}
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
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
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => void signOut()}
            className="ml-1 flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </nav>
      </header>
      <main className="relative z-10 flex flex-1 flex-col">{children}</main>
    </div>
  );
}
