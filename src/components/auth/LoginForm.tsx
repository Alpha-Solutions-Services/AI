"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function authErrorMessage(reason: string | null): string {
  if (!reason) {
    return "Authentication failed. Confirm Supabase Redirect URLs include https://ai.alphasolutions.software/auth/callback";
  }
  const decoded = decodeURIComponent(reason);
  if (decoded === "not_staff") {
    return "This account is not authorized for Alpha staff access.";
  }
  if (decoded === "missing_code") {
    return "Sign-in was interrupted. Try again.";
  }
  return decoded;
}

export function LoginForm() {
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    sp?.get("error") === "auth" ? authErrorMessage(sp.get("reason")) : null
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Auth is not configured");
      setBusy(false);
      return;
    }
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) throw err;
      const staffRes = await fetch("/api/staff");
      if (!staffRes.ok) {
        await supabase.auth.signOut();
        throw new Error("This account is not authorized for Alpha staff access");
      }
      const next = sp?.get("next") || "/";
      window.location.href = next.startsWith("/") ? next : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Auth is not configured");
      setBusy(false);
      return;
    }
    const next = sp?.get("next") || "/";
    // Prefer configured AI origin so OAuth never falls back to marketing/portal Site URL.
    const aiOrigin = (
      process.env.NEXT_PUBLIC_AI_URL?.trim() || window.location.origin
    ).replace(/\/$/, "");
    // No query string on redirectTo — Supabase Redirect URL allowlist is exact-path sensitive.
    // Store next in a short-lived cookie (same pattern as Learn Dispatch).
    document.cookie = `alpha_oauth_next=${encodeURIComponent(next)}; Path=/; Max-Age=600; SameSite=Lax`;
    const redirectTo = `${aiOrigin}/auth/callback`;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (err) {
      setError(
        `${err.message} — add ${redirectTo} in Supabase → Authentication → URL Configuration → Redirect URLs.`
      );
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-8 shadow-[var(--glow-md)] backdrop-blur-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image
          src="/alpha-logo.png"
          alt="Alpha"
          width={72}
          height={72}
          className="mb-4 rounded-xl"
          priority
        />
        <p
          className="text-4xl tracking-tight text-[var(--color-text)]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          Alpha
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Staff command assistant · ai.alphasolutions.software
        </p>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Staff email"
          className="w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[var(--color-accent)] py-3 text-sm font-semibold text-[#05080f] disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void google()}
        className="mt-3 w-full border border-[var(--color-border)] py-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
      >
        Continue with Google
      </button>
    </div>
  );
}
