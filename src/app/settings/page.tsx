"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/alpha/AppShell";

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [speak, setSpeak] = useState(false);
  const [listenAfter, setListenAfter] = useState(false);

  useEffect(() => {
    void fetch("/api/me")
      .then((r) => r.json())
      .then((j) => setEmail(j.email ?? null));
    try {
      setSpeak(localStorage.getItem("alpha_speak") === "1");
      setListenAfter(localStorage.getItem("alpha_listen_after") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(key: "alpha_speak" | "alpha_listen_after", value: boolean) {
    try {
      localStorage.setItem(key, value ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (key === "alpha_speak") setSpeak(value);
    else setListenAfter(value);
  }

  return (
    <AppShell email={email} centerOnly>
      <div className="mx-auto w-full max-w-xl overflow-y-auto px-4 py-6 md:px-6">
        <h1
          className="text-2xl uppercase tracking-[0.16em] text-[var(--color-accent-2)]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          Settings
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Voice preferences for this browser. Write tools always require
          confirm.
        </p>

        <label className="mt-8 flex cursor-pointer items-start gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <input
            type="checkbox"
            checked={speak}
            onChange={(e) => toggle("alpha_speak", e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm text-[var(--color-text)]">
              Speak replies (TTS)
            </span>
            <span className="mt-1 block text-xs text-[var(--color-muted)]">
              Alpha reads assistant replies aloud via the browser voice engine.
            </span>
          </span>
        </label>

        <label className="mt-3 flex cursor-pointer items-start gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <input
            type="checkbox"
            checked={listenAfter}
            onChange={(e) => toggle("alpha_listen_after", e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm text-[var(--color-text)]">
              Listen after reply (preference)
            </span>
            <span className="mt-1 block text-xs text-[var(--color-muted)]">
              Continuous wake is off by default for privacy. Use the mic for
              push-to-talk; this flag is stored for future hands-free mode.
            </span>
          </span>
        </label>

        <div className="mt-8 border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4 text-xs text-[var(--color-muted)]">
          <p className="text-sm text-[var(--color-text)]">Tool permissions</p>
          <p className="mt-2">
            Read tools (Portal/TMS/Learn Dispatch/web) run immediately. Write
            tools (emails, status updates, notes) show a Confirm card every
            time.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
