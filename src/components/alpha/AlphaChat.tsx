"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { ConfirmCard, type PendingConfirm } from "@/components/alpha/ConfirmCard";
import { LiveStatus } from "@/components/alpha/LiveStatus";
import {
  VoiceDock,
  speakText,
  stopSpeaking,
} from "@/components/alpha/VoiceDock";
import type { ClientAction } from "@/lib/alpha/tools/browser";
import { cleanVoiceTranscript } from "@/lib/alpha/voice-text";

type Msg = {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
};

const SUGGESTIONS = [
  "How many open Portal tickets are there?",
  "Portal admin کھولو",
  "Search the web for FMCSA ELD updates",
  "Learn Dispatch sessions خلاصہ کرو",
  "Open AFN support inbox",
  "Business snapshot",
];

async function runClientActions(actions: ClientAction[]) {
  for (const action of actions) {
    try {
      if (action.type === "open_url") {
        window.open(action.url, "_blank", "noopener,noreferrer");
      } else if (action.type === "copy_text") {
        await navigator.clipboard.writeText(action.text);
      } else if (action.type === "speak") {
        speakText(action.text);
      } else if (action.type === "navigate") {
        window.location.href = action.path;
      }
    } catch (err) {
      console.warn("[alpha] client action failed", action, err);
    }
  }
}

export function AlphaChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingConfirm[]>([]);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const speakingRef = useRef(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("alpha_speak");
      setSpeakEnabled(s === null ? true : s === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending, busy, interim]);

  function persistSpeak(v: boolean) {
    setSpeakEnabled(v);
    try {
      localStorage.setItem("alpha_speak", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function handleBargeIn() {
    if (!speakingRef.current) return;
    stopSpeaking();
    speakingRef.current = false;
    setSpeaking(false);
  }

  const mode = speaking
    ? "speaking"
    : listening
      ? "listening"
      : busy
        ? "thinking"
        : "idle";

  async function send(message: string) {
    const trimmed = cleanVoiceTranscript(message);
    if (!trimmed || busyRef.current) return;
    handleBargeIn();
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setText("");
    setInterim("");
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: "user", content: trimmed },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationId: conversationId || undefined,
        }),
      });
      const raw = await res.text();
      let json: {
        error?: string;
        conversationId?: string;
        reply?: string;
        pendingConfirms?: PendingConfirm[];
        clientActions?: ClientAction[];
      } = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          res.status === 504
            ? "Alpha timed out — try a shorter question."
            : `Chat failed (${res.status || "network"}). Try again.`
        );
      }
      if (!res.ok) throw new Error(json.error || `Chat failed (${res.status})`);

      setConversationId(json.conversationId || null);
      const reply = String(json.reply || "");
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: "assistant", content: reply },
      ]);
      if (Array.isArray(json.pendingConfirms) && json.pendingConfirms.length) {
        setPending((p) => [...p, ...json.pendingConfirms!]);
      }
      if (Array.isArray(json.clientActions) && json.clientActions.length) {
        await runClientActions(json.clientActions);
      }
      if (speakEnabled && reply) {
        speakingRef.current = true;
        setSpeaking(true);
        speakText(reply, {
          onStart: () => {
            speakingRef.current = true;
            setSpeaking(true);
          },
          onEnd: () => {
            speakingRef.current = false;
            setSpeaking(false);
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h1
            className="truncate text-base font-semibold tracking-tight sm:text-lg"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Chat
          </h1>
          <p className="truncate text-xs text-[var(--color-muted)]">
            Portal · TMS · Learn · Support
          </p>
        </div>
        <LiveStatus mode={mode} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
          {messages.length === 0 && !listening ? (
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pt-4 sm:pt-8">
              <div>
                <p className="text-sm text-[var(--color-muted)]">
                  Alpha is live. Ask about tickets, loads, academy, or open
                  Support to join AFN chats.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    dir="auto"
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-left text-sm text-[var(--color-chrome)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-2)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {(listening || interim) && (
            <p
              className="mx-auto max-w-2xl rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-accent-2)]"
              dir="auto"
            >
              {interim || "Listening…"}
            </p>
          )}

          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              dir="auto"
              className={`mx-auto max-w-2xl whitespace-pre-wrap rounded-lg px-4 py-3 text-[14px] leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-[var(--color-accent-dim)] text-[var(--color-text)]"
                  : m.role === "assistant"
                    ? "mr-auto border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
                    : "text-[var(--color-muted)]"
              }`}
            >
              {m.content}
            </motion.div>
          ))}

          {pending.map((p) => (
            <div key={p.runId} className="mx-auto max-w-2xl">
              <ConfirmCard
                item={p}
                onDone={(runId, status, result) => {
                  setPending((list) => list.filter((x) => x.runId !== runId));
                  setMessages((m) => [
                    ...m,
                    {
                      id: `t-${runId}`,
                      role: "assistant",
                      content:
                        status === "cancelled"
                          ? `Cancelled ${p.toolName}.`
                          : `Executed ${p.toolName}: ${
                              (result as { summary?: string })?.summary ||
                              status
                            }`,
                    },
                  ]);
                }}
              />
            </div>
          ))}

          {busy ? (
            <div className="mx-auto flex max-w-2xl items-center gap-2 text-sm text-[var(--color-muted)]">
              <Loader2 className="animate-spin" size={16} /> Working…
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {error ? (
          <p className="shrink-0 px-4 pb-2 text-sm text-red-400 sm:px-6">
            {error}
          </p>
        ) : null}
      </div>

      <form
        className="mt-auto shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 sm:px-5"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-2">
          <VoiceDock
            disabled={busy}
            agentSpeaking={speaking}
            speakEnabled={speakEnabled}
            onSpeakEnabledChange={persistSpeak}
            onListeningChange={setListening}
            onInterim={setInterim}
            onBargeIn={handleBargeIn}
            onTranscript={(t) => {
              if (busyRef.current || speakingRef.current) return;
              const cleaned = cleanVoiceTranscript(t);
              if (!cleaned) return;
              setText(cleaned);
              setInterim(cleaned);
              void send(cleaned);
            }}
          />
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              dir="auto"
              placeholder="Message Alpha…"
              className="max-h-28 min-h-[48px] flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-3 text-sm outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(text);
                }
              }}
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] text-white transition hover:brightness-110 disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
