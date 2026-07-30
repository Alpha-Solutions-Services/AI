"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { ConfirmCard, type PendingConfirm } from "@/components/alpha/ConfirmCard";
import { VoiceDock, speakText } from "@/components/alpha/VoiceDock";

type Msg = {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
};

const SUGGESTIONS = [
  "Summarize open Portal tickets",
  "What does Learn Dispatch cover?",
  "Search the web for FMCSA ELD updates",
  "Show TMS dispatcher queue",
];

export function AlphaChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingConfirm[]>([]);
  const [speakEnabled, setSpeakEnabled] = useState(false);
  const [listenAfterReply, setListenAfterReply] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setSpeakEnabled(localStorage.getItem("alpha_speak") === "1");
      setListenAfterReply(localStorage.getItem("alpha_listen_after") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function persistSpeak(v: boolean) {
    setSpeakEnabled(v);
    try {
      localStorage.setItem("alpha_speak", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    setText("");
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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Chat failed");

      setConversationId(json.conversationId);
      const reply = String(json.reply || "");
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: "assistant", content: reply },
      ]);
      if (Array.isArray(json.pendingConfirms)) {
        setPending((p) => [...p, ...json.pendingConfirms]);
      }
      if (speakEnabled && reply) speakText(reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-64px)] w-full max-w-4xl flex-col px-4 pb-4 pt-6 md:px-6">
      <div className="mb-4">
        <h1
          className="text-3xl text-[var(--color-text)] md:text-4xl"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          Alpha
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Portal · TMS · Learn Dispatch · company knowledge · live web
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
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
            className={`max-w-[92%] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed ${
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
        className="mt-3 flex items-end gap-2 border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <VoiceDock
          disabled={busy}
          speakEnabled={speakEnabled}
          onSpeakEnabledChange={persistSpeak}
          onTranscript={(t) => {
            setText(t);
            void send(t);
          }}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Ask Alpha anything — company systems or the internet…"
          className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)]"
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
          className="inline-flex h-10 w-10 items-center justify-center bg-[var(--color-accent)] text-[#05080f] disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
      <p className="mt-2 text-[11px] text-[var(--color-muted)]">
        Write actions always ask for confirm. Voice: mic = listen
        {listenAfterReply ? " · listen-after-reply on in Settings" : ""}.
      </p>
    </div>
  );
}
