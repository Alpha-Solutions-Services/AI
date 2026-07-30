"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult:
    | ((ev: {
        results: {
          [i: number]: { [j: number]: { transcript: string }; isFinal?: boolean };
          length: number;
        };
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function VoiceDock({
  disabled,
  speakEnabled,
  onSpeakEnabledChange,
  onTranscript,
}: {
  disabled?: boolean;
  speakEnabled: boolean;
  onSpeakEnabledChange: (v: boolean) => void;
  onTranscript: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastSentRef = useRef("");

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      mediaRef.current?.stop();
    };
  }, []);

  function emitTranscript(text: string) {
    const cleaned = text.trim();
    if (!cleaned) return;
    // Prevent duplicate spam from recognition quirks
    if (cleaned === lastSentRef.current) return;
    lastSentRef.current = cleaned;
    onTranscript(cleaned);
  }

  async function startBrowserSpeech() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return false;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (ev) => {
      const text = ev.results?.[0]?.[0]?.transcript?.trim();
      if (text) emitTranscript(text);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    return true;
  }

  async function startWhisperCapture() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      void (async () => {
        setUploading(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const form = new FormData();
          form.append("audio", blob, "alpha.webm");
          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: form,
          });
          const raw = await res.text();
          let json: { text?: string; error?: string } = {};
          try {
            json = raw ? JSON.parse(raw) : {};
          } catch {
            /* ignore */
          }
          if (res.ok && json.text) emitTranscript(String(json.text));
        } finally {
          setUploading(false);
          stream.getTracks().forEach((t) => t.stop());
        }
      })();
    };
    mediaRef.current = recorder;
    recorder.start();
    setListening(true);
  }

  async function toggleListen() {
    if (listening) {
      recognitionRef.current?.stop();
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      setListening(false);
      return;
    }
    if (disabled || uploading) return;
    const usedBrowser = await startBrowserSpeech();
    if (!usedBrowser) await startWhisperCapture();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => void toggleListen()}
        className={`inline-flex h-10 w-10 items-center justify-center border ${
          listening
            ? "border-[var(--color-accent)] bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
            : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
        } disabled:opacity-40`}
        title={listening ? "Stop listening" : "Push to talk"}
      >
        {listening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
      <button
        type="button"
        onClick={() => onSpeakEnabledChange(!speakEnabled)}
        className={`inline-flex h-10 w-10 items-center justify-center border border-[var(--color-border)] ${
          speakEnabled
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-muted)]"
        }`}
        title={speakEnabled ? "Mute Alpha voice" : "Enable spoken replies"}
      >
        {speakEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      {uploading ? (
        <span className="text-[11px] text-[var(--color-muted)]">Transcribing…</span>
      ) : null}
    </div>
  );
}

export function speakText(
  text: string,
  opts?: { onStart?: () => void; onEnd?: () => void }
) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    opts?.onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.slice(0, 1200));
  utter.rate = 1.02;
  utter.pitch = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => /en-GB|Daniel|Google UK/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("en"));
  if (preferred) utter.voice = preferred;
  utter.onstart = () => opts?.onStart?.();
  utter.onend = () => opts?.onEnd?.();
  utter.onerror = () => opts?.onEnd?.();
  window.speechSynthesis.speak(utter);
}
