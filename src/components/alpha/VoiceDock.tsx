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
}: {
  disabled?: boolean;
  speakEnabled: boolean;
  onSpeakEnabledChange: (v: boolean) => void;
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  onLevel?: (level: number) => void;
}) {
  const [listening, setListening] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastSentRef = useRef("");
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const levelRafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      mediaRef.current?.stop();
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
    // Urdu + English — browsers use one primary; Whisper fallback handles the other.
    recognition.lang = "ur-PK";
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
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      void (async () => {
        setUploading(true);
        stopLevelMeter();
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const form = new FormData();
          form.append("audio", blob, "alpha.webm");
          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: form,
          });
          const raw = await res.text();
          let json: { text?: string } = {};
          try {
            json = raw ? JSON.parse(raw) : {};
          } catch {
            /* ignore */
          }
          if (res.ok && json.text) {
            onInterim?.(String(json.text));
            emitTranscript(String(json.text));
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
    // Prefer Whisper for Urdu+English accuracy when MediaRecorder exists
    if (typeof MediaRecorder !== "undefined") {
      try {
        await startWhisperCapture();
        return;
      } catch {
        /* fall through */
      }
    }
    await startBrowserSpeech();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => void toggleListen()}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
          listening
            ? "border-[var(--color-accent)] bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
            : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
        } disabled:opacity-40`}
        title={listening ? "Stop listening" : "Push to talk (English / اردو)"}
      >
        {listening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
      <button
        type="button"
        onClick={() => onSpeakEnabledChange(!speakEnabled)}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] ${
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
