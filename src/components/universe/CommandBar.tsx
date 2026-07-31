"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, MicOff, Send } from "lucide-react";
import { useUniverse } from "@/components/universe/UniverseProvider";
import { useVoice } from "@/components/universe/VoiceProvider";
import {
  ConfirmCard,
  type PendingConfirm,
} from "@/components/alpha/ConfirmCard";

type AlphaResponse = {
  reply?: string;
  error?: string;
  conversationId?: string | null;
  intent?: string | null;
  action?: {
    type: string;
    path?: string;
    url?: string;
    query?: string;
  };
  requiresConfirmation?: boolean;
  confirmationLabel?: string;
  pendingConfirms?: PendingConfirm[];
  source?: string;
};

/**
 * Persistent Ask Alpha bar — routes through /api/alpha → intents or /api/chat.
 */
export function CommandBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const {
    activePlanetId,
    setAgentStatus,
    conversation,
    setConversation,
    setStarReply,
    setBeamPlanetId,
    pendingConfirms,
    setPendingConfirms,
    voiceInbox,
    clearVoiceInbox,
    setVoiceLevel,
  } = useUniverse();
  const voice = useVoice();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localConfirm, setLocalConfirm] = useState<string | null>(null);
  const busyRef = useRef(false);
  const t0Ref = useRef(0);
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;

  useEffect(() => {
    setVoiceLevel(voice.level);
    if (voice.listening) setAgentStatus("listening");
  }, [voice.level, voice.listening, setVoiceLevel, setAgentStatus]);

  const send = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      setLocalConfirm(null);
      setText("");
      t0Ref.current = performance.now();
      setAgentStatus("thinking");
      setStarReply("Thinking…");

      const prev = conversationRef.current;
      const userMsg = {
        id: `u-${Date.now()}`,
        role: "user" as const,
        content: trimmed,
      };
      setConversation({
        messages: [...prev.messages, userMsg],
      });

      try {
        const res = await fetch("/api/alpha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            conversationId: prev.conversationId || undefined,
            context: { activePlanet: activePlanetId },
          }),
        });
        const json = (await res.json()) as AlphaResponse;
        if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);

        if (json.conversationId) {
          setConversation({ conversationId: json.conversationId });
        }

        const reply = String(json.reply || "");
        setStarReply(reply);
        setConversation({
          messages: [
            ...conversationRef.current.messages.filter((m) => m.id !== userMsg.id),
            userMsg,
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              content: reply,
            },
          ],
        });

        if (json.requiresConfirmation && json.confirmationLabel) {
          setLocalConfirm(json.confirmationLabel);
        }

        if (Array.isArray(json.pendingConfirms) && json.pendingConfirms.length) {
          setPendingConfirms(
            json.pendingConfirms.map((p) => ({
              runId: p.runId,
              toolName: p.toolName,
              args: p.args,
              description: `${p.toolName} requires confirmation`,
            }))
          );
        }

        const action = json.action;
        if (action?.type === "navigate" && action.path) {
          setBeamPlanetId(
            action.path.replace("/universe/", "").split("/")[0] || null
          );
          router.push(action.path);
        } else if (action?.type === "open_url" && action.url) {
          window.open(action.url, "_blank", "noopener,noreferrer");
        } else if (action?.type === "dispatch_query") {
          setBeamPlanetId("dispatch");
          router.push("/universe/dispatch");
        }

        setAgentStatus("speaking");
        voice.speak(reply, () => {
          setAgentStatus("idle");
          const ms = Math.round(performance.now() - t0Ref.current);
          console.info(
            `[alpha-voice] end-to-end ~${ms}ms (speech start→TTS end approx)`
          );
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Alpha failed";
        setError(msg);
        setStarReply(msg);
        setAgentStatus("idle");
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [
      activePlanetId,
      router,
      setAgentStatus,
      setBeamPlanetId,
      setConversation,
      setPendingConfirms,
      setStarReply,
      voice,
    ]
  );

  useEffect(() => {
    if (!voiceInbox) return;
    const t = voiceInbox;
    clearVoiceInbox();
    void send(t);
  }, [voiceInbox, clearVoiceInbox, send]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(text);
  }

  return (
    <div className={`mx-auto w-full max-w-xl ${className}`}>
      {localConfirm ? (
        <p className="mb-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          Confirm needed: {localConfirm}
        </p>
      ) : null}

      {pendingConfirms.map((p) => (
        <div key={p.runId} className="mb-2">
          <ConfirmCard
            item={{
              runId: p.runId,
              toolName: p.toolName,
              args: p.args,
            }}
            onDone={(runId) => {
              setPendingConfirms(pendingConfirms.filter((x) => x.runId !== runId));
            }}
          />
        </div>
      ))}

      {voice.interim && voice.listening ? (
        <p className="mb-1 text-center text-[11px] text-sky-300/90" dir="auto">
          {voice.interim}
        </p>
      ) : null}

      <form
        id="voice"
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-full border border-sky-400/25 bg-[#0a1220]/85 px-3 py-2 shadow-[0_0_40px_rgba(56,189,248,0.15)] backdrop-blur-xl"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Alpha AI anything..."
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
          aria-label="Ask Alpha AI"
          disabled={busy}
        />
        <button
          type="button"
          className={`flex h-9 w-9 items-center justify-center rounded-full border touch-manipulation ${
            voice.listening
              ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
              : "border-sky-400/30 text-sky-300 hover:bg-sky-500/10"
          }`}
          title={
            voice.supported
              ? "Hold / tap for push-to-talk"
              : "Voice not supported"
          }
          aria-label="Push to talk"
          disabled={!voice.supported || busy}
          onMouseDown={() => voice.startPtt()}
          onMouseUp={() => {
            voice.stopPtt();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            voice.startPtt();
          }}
          onTouchEnd={() => voice.stopPtt()}
          onClick={() => {
            if (voice.listening) {
              voice.stopPtt();
              if (voice.interim.trim()) void send(voice.interim);
            } else {
              voice.startPtt();
            }
          }}
        >
          {voice.listening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-400 text-[#030712] disabled:opacity-40 touch-manipulation"
          aria-label="Send"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>

      {error ? <p className="mt-1 text-center text-[11px] text-rose-400">{error}</p> : null}
      {voice.wakeFallbackReason ? (
        <p className="mt-1 text-center text-[10px] text-slate-500">
          {voice.wakeFallbackReason}
        </p>
      ) : null}
    </div>
  );
}
