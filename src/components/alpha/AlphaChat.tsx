"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { ConfirmCard, type PendingConfirm } from "@/components/alpha/ConfirmCard";
import { SpeakingOrb } from "@/components/alpha/SpeakingOrb";
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
  const [level, setLevel] = useState(0);
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
    setLevel(0);
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
    // Interrupt any in-progress reply voice
    handleBargeIn();
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setText("");
    setInterim("");
    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((m) => [...m, userMsg]);

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
        speakText(reply, {
          onStart: () => {
            speakingRef.current = true;
            setSpeaking(true);
          },
          onEnd: () => {
            speakingRef.current = false;
            setSpeaking(false);
            setLevel(0);
          },
          onBoundary: (p) => setLevel(0.25 + p * 0.75),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const showHeroOrb = messages.length === 0 || listening || speaking || busy;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col px-3 pt-3 sm:px-4 sm:pt-4">
        <div
          className={`mb-2 flex flex-col items-center justify-center ${
            showHeroOrb ? "" : "scale-90"
          }`}
        >
          <div
            className={
              showHeroOrb ? "w-full max-w-[380px]" : "w-[150px] sm:w-[180px]"
            }
          >
            <SpeakingOrb mode={mode} level={level} />
          </div>
          <p className="mt-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.32em] text-[var(--color-accent-2)]/85">
            {mode === "listening"
              ? "Listening · سن رہا ہے"
              : mode === "speaking"
                ? "Speaking · بول رہا ہے"
                : mode === "thinking"
                  ? "Processing"
                  : "Alpha core · ready"}
          </p>
          {(listening || interim) && (
            <p
              className="glass-strong mt-2.5 max-w-lg rounded-2xl px-4 py-3 text-center text-sm text-[var(--color-accent-2)]"
              dir="auto"
            >
              {interim || "…"}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
          {messages.length === 0 && !listening ? (
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  dir="auto"
                  className="glass-chip rounded-3xl px-3.5 py-3.5 text-left text-[13px] text-[var(--color-chrome)] transition hover:border-[var(--color-border-glow)] hover:bg-white/[0.06]"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              dir="auto"
              className={`mx-auto max-w-2xl whitespace-pre-wrap rounded-3xl px-4 py-3 text-[14px] leading-relaxed ${
                m.role === "user"
                  ? "glass-strong ml-auto border-[var(--color-accent)]/35 text-[var(--color-text)]"
                  : m.role === "assistant"
                    ? "glass-chip mr-auto text-[var(--color-text)]"
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
            <div className="inline-flex items-center gap-2 px-1 text-sm text-[var(--color-muted)]">
              <Loader2 className="animate-spin" size={16} /> Processing…
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {error ? <p className="mb-2 text-sm text-red-400">{error}</p> : null}
      </div>

      <form
        className="mt-auto border-t border-[var(--color-border)] bg-[rgba(3,7,18,0.45)] px-3 py-3.5 backdrop-blur-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5">
          <VoiceDock
            disabled={busy}
            speakEnabled={speakEnabled}
            onSpeakEnabledChange={persistSpeak}
            onListeningChange={setListening}
            onInterim={setInterim}
            onLevel={setLevel}
            onBargeIn={handleBargeIn}
            onTranscript={(t) => {
              if (busyRef.current) return;
              const cleaned = cleanVoiceTranscript(t);
              if (!cleaned) return;
              setText(cleaned);
              setInterim(cleaned);
              void send(cleaned);
            }}
          />
          <div className="flex items-end gap-2.5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              dir="auto"
              placeholder="Ask Alpha AI Agent anything…"
              className="glass-chip max-h-28 min-h-[48px] flex-1 resize-none rounded-2xl px-4 py-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]/55"
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
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-accent)]/45 bg-[var(--color-accent)] text-[#030712] shadow-[var(--glow-sm)] transition disabled:opacity-40"
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
