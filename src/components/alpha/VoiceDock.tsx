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
          [i: number]: {
            [j: number]: { transcript: string };
            isFinal?: boolean;
          };
          length: number;
        };
      }) => void)
    | null;
  onerror: ((ev?: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

function hasUrduScript(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

export function VoiceDock({
  disabled,
  speakEnabled,
  onSpeakEnabledChange,
  onTranscript,
  onInterim,
  onListeningChange,
  onLevel,
  compact = false,
}: {
  disabled?: boolean;
  speakEnabled: boolean;
  onSpeakEnabledChange: (v: boolean) => void;
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  onLevel?: (level: number) => void;
  /** Smaller icon-only row for tight layouts */
  compact?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastSentRef = useRef("");
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const levelRafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      stopLevelMeter();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function setListenState(v: boolean) {
    setListening(v);
    onListeningChange?.(v);
    if (!v) {
      onInterim?.("");
      onLevel?.(0);
    }
  }

  function stopLevelMeter() {
    if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
    levelRafRef.current = 0;
    analyserRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
  }

  function startLevelMeter(stream: MediaStream) {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;
        onLevel?.(Math.min(1, avg * 2.2));
        levelRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* analyser optional */
    }
  }

  function emitTranscript(text: string) {
    const cleaned = text.trim();
    if (!cleaned) return;
    if (cleaned === lastSentRef.current) return;
    lastSentRef.current = cleaned;
    onTranscript(cleaned);
  }

  async function startBrowserSpeech() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return false;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (ev) => {
      let interim = "";
      let finalText = "";
      for (let i = 0; i < ev.results.length; i++) {
        const row = ev.results[i];
        const piece = row?.[0]?.transcript || "";
        if (row?.isFinal) finalText += piece;
        else interim += piece;
      }
      if (interim) onInterim?.(interim);
      if (finalText.trim()) {
        onInterim?.(finalText.trim());
        emitTranscript(finalText.trim());
      }
    };
    recognition.onerror = () => {
      setListenState(false);
      stopLevelMeter();
    };
    recognition.onend = () => {
      setListenState(false);
      stopLevelMeter();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    recognitionRef.current = recognition;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startLevelMeter(stream);
    } catch {
      /* mic meter optional */
    }

    recognition.start();
    setListenState(true);
    return true;
  }

  async function startWhisperCapture() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    startLevelMeter(stream);
    onInterim?.("Listening… speak now");
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      void (async () => {
        if (autoStopRef.current) {
          clearTimeout(autoStopRef.current);
          autoStopRef.current = null;
        }
        setUploading(true);
        stopLevelMeter();
        onInterim?.("Transcribing…");
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          if (blob.size < 800) {
            onInterim?.("");
            setMicError("No speech captured — tap Voice and try again");
            return;
          }
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
          if (res.ok && json.text) {
            setMicError(null);
            onInterim?.(String(json.text));
            emitTranscript(String(json.text));
          } else {
            setMicError(json.error || "Transcription failed");
          }
        } finally {
          setUploading(false);
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          setListenState(false);
        }
      })();
    };
    mediaRef.current = recorder;
    recorder.start();
    setListenState(true);
    setMicError(null);
    // Auto-stop after 12s so users aren't stuck recording forever
    autoStopRef.current = setTimeout(() => {
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    }, 12000);
  }

  async function toggleListen() {
    if (listening) {
      recognitionRef.current?.stop();
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      stopLevelMeter();
      setListenState(false);
      return;
    }
    if (disabled || uploading) return;
    setMicError(null);
    if (typeof MediaRecorder !== "undefined") {
      try {
        await startWhisperCapture();
        return;
      } catch (err) {
        const msg =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Microphone blocked — allow mic in browser settings"
            : "Could not open microphone";
        setMicError(msg);
      }
    }
    try {
      const ok = await startBrowserSpeech();
      if (!ok) setMicError("Voice not supported in this browser");
    } catch {
      setMicError("Could not start voice recognition");
    }
  }

  if (compact) {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => void toggleListen()}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center border ${
              listening
                ? "border-[var(--color-accent)] bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
            } disabled:opacity-40`}
            title={listening ? "Stop & send" : "Voice (EN / اردو)"}
            aria-label={listening ? "Stop listening" : "Start voice"}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button
            type="button"
            onClick={() => onSpeakEnabledChange(!speakEnabled)}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--color-border)] ${
              speakEnabled
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-muted)]"
            }`}
            title={speakEnabled ? "Mute Alpha voice" : "Enable spoken replies"}
            aria-label="Toggle spoken replies"
          >
            {speakEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
        {micError ? (
          <p className="max-w-[12rem] text-[10px] text-red-400">{micError}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => void toggleListen()}
          className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2.5 border px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition sm:flex-none sm:min-w-[11rem] ${
            listening
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent-2)] shadow-[0_0_20px_rgba(0,191,255,0.35)]"
              : "border-[var(--color-accent)]/45 bg-[var(--color-accent-dim)] text-[var(--color-accent-2)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/15"
          } disabled:opacity-40`}
          aria-pressed={listening}
        >
          {listening ? <MicOff size={20} /> : <Mic size={20} />}
          <span>
            {uploading
              ? "Transcribing…"
              : listening
                ? "Tap to send"
                : "Voice"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSpeakEnabledChange(!speakEnabled)}
          className={`inline-flex h-12 items-center gap-2 border px-3 text-xs uppercase tracking-wider ${
            speakEnabled
              ? "border-[var(--color-border)] text-[var(--color-accent)]"
              : "border-[var(--color-border)] text-[var(--color-muted)]"
          }`}
          title={speakEnabled ? "Mute Alpha voice" : "Enable spoken replies"}
        >
          {speakEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span className="hidden sm:inline">
            {speakEnabled ? "TTS on" : "TTS off"}
          </span>
        </button>

        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
          EN · اردو
        </span>
      </div>

      {listening ? (
        <p className="text-[11px] text-[var(--color-accent-2)]">
          Listening — speak, then tap again to send (auto-stops at 12s)
        </p>
      ) : null}
      {micError ? <p className="text-[11px] text-red-400">{micError}</p> : null}
    </div>
  );
}

export function speakText(
  text: string,
  opts?: {
    onStart?: () => void;
    onEnd?: () => void;
    onBoundary?: (progress: number) => void;
  }
) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    opts?.onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.slice(0, 1600));
  utter.rate = 1.02;
  utter.pitch = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const wantUrdu = hasUrduScript(text);
  const preferred = wantUrdu
    ? voices.find((v) => /ur|pak|hindi|india/i.test(`${v.lang} ${v.name}`)) ||
      voices.find((v) => v.lang.startsWith("ur"))
    : voices.find((v) => /en-GB|Daniel|Google UK/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en"));
  if (preferred) utter.voice = preferred;
  if (wantUrdu) utter.lang = preferred?.lang || "ur-PK";

  const len = Math.max(1, text.length);
  utter.onboundary = (ev) => {
    const charIndex = typeof ev.charIndex === "number" ? ev.charIndex : 0;
    opts?.onBoundary?.(Math.min(1, charIndex / len));
  };
  utter.onstart = () => {
    opts?.onStart?.();
    opts?.onBoundary?.(0.15);
  };
  utter.onend = () => {
    opts?.onBoundary?.(0);
    opts?.onEnd?.();
  };
  utter.onerror = () => {
    opts?.onBoundary?.(0);
    opts?.onEnd?.();
  };
  window.speechSynthesis.speak(utter);
}
