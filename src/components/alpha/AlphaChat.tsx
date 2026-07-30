"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { ConfirmCard, type PendingConfirm } from "@/components/alpha/ConfirmCard";
import { SpeakingOrb } from "@/components/alpha/SpeakingOrb";
import { VoiceDock, speakText } from "@/components/alpha/VoiceDock";
import type { ClientAction } from "@/lib/alpha/tools/browser";

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

  const mode = speaking
    ? "speaking"
    : listening
      ? "listening"
      : busy
        ? "thinking"
        : "idle";

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || busyRef.current) return;
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
      if (!res.ok) {
        throw new Error(json.error || `Chat failed (${res.status})`);
      }

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
          onStart: () => setSpeaking(true),
          onEnd: () => {
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
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-3xl flex-1 flex-col px-4 pt-4 md:max-w-4xl md:px-6 md:pt-6">
      {/* Centered agent orb */}
      {showHeroOrb ? (
        <div className="mb-3 flex flex-col items-center justify-center">
          <SpeakingOrb mode={mode} level={level} />
          <p className="mt-1 text-center text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
            {mode === "listening"
              ? "Listening · سن رہا ہے"
              : mode === "speaking"
                ? "Speaking · بول رہا ہے"
                : mode === "thinking"
                  ? "Thinking · سوچ رہا ہے"
                  : "Alpha ready · تیار"}
          </p>
          {(listening || interim) && (
            <p
              className="mt-2 max-w-md px-3 text-center text-sm text-[var(--color-accent-2)]"
              dir="auto"
            >
              {interim || "…"}
            </p>
          )}
        </div>
      ) : (
        <div className="mb-2 flex justify-center md:mb-3">
          <div className="w-[140px] md:w-[180px]">
            <SpeakingOrb mode={mode} level={level} />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.length === 0 && !listening ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                dir="auto"
                className="border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-4 py-3 text-left text-sm text-[var(--color-chrome)] hover:border-[var(--color-border-glow)]"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            dir="auto"
            className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed md:max-w-[85%] ${
              m.role === "user"
                ? "ml-auto bg-[var(--color-accent)] text-[#05080f]"
                : m.role === "assistant"
                  ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                  : "bg-[var(--color-bg)] text-[var(--color-muted)]"
            }`}
          >
            {m.content}
          </motion.div>
        ))}

        {pending.map((p) => (
          <ConfirmCard
            key={p.runId}
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
                          (result as { summary?: string })?.summary || status
                        }`,
                },
              ]);
            }}
          />
        ))}

        {busy ? (
          <div className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <Loader2 className="animate-spin" size={16} /> Thinking…
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="mb-2 text-sm text-red-400">{error}</p> : null}

      <form
        className="sticky bottom-0 z-20 -mx-4 mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 py-3 backdrop-blur-md md:static md:mx-0 md:mt-3 md:border md:border-[var(--color-border)] md:bg-[var(--color-surface)]/70 md:px-2 md:py-2 md:backdrop-blur-none"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <div className="flex items-end gap-2">
          <VoiceDock
            disabled={busy}
            speakEnabled={speakEnabled}
            onSpeakEnabledChange={persistSpeak}
            onListeningChange={setListening}
            onInterim={setInterim}
            onLevel={setLevel}
            onTranscript={(t) => {
              if (busyRef.current) return;
              setText(t);
              setInterim(t);
              void send(t);
            }}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            dir="auto"
            placeholder="English or اردو — ask Alpha…"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)] md:bg-transparent md:px-2"
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
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] text-[#05080f] disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-2 text-[10px] text-[var(--color-muted)] md:text-[11px]">
          Mic: English + اردو · particles form A · confirm before writes
        </p>
      </form>
    </div>
  );
}
