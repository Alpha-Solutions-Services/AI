"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult:
    | ((ev: {
        resultIndex: number;
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

/**
 * Live talk: mic stays on, speech auto-sends when you pause.
 * Tap once to start live mode; tap again to stop. No tap-to-send.
 */
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
  const [live, setLive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [modeLabel, setModeLabel] = useState<"live" | "whisper" | null>(null);

  const liveRef = useRef(false);
  const disabledRef = useRef(!!disabled);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastSentRef = useRef("");
  const lastSentAtRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const levelRafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const whisperLoopRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    disabledRef.current = !!disabled;
  }, [disabled]);

  useEffect(() => {
    return () => {
      liveRef.current = false;
      whisperLoopRef.current = false;
      recognitionRef.current?.abort?.();
      recognitionRef.current?.stop();
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      stopLevelMeter();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function setLiveState(v: boolean) {
    liveRef.current = v;
    setLive(v);
    onListeningChange?.(v);
    if (!v) {
      onInterim?.("");
      onLevel?.(0);
      setModeLabel(null);
    }
  }

  function stopLevelMeter() {
    if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
    levelRafRef.current = 0;
    analyserRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
  }

  function startLevelMeter(
    stream: MediaStream,
    onLoud?: (loud: boolean) => void
  ) {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;
        onLevel?.(Math.min(1, avg * 2.4));
        onLoud?.(avg > 0.045);
        levelRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* optional */
    }
  }

  function emitTranscript(text: string) {
    const cleaned = text.trim();
    if (!cleaned || cleaned.length < 2) return;
    const now = Date.now();
    if (cleaned === lastSentRef.current && now - lastSentAtRef.current < 4000) {
      return;
    }
    lastSentRef.current = cleaned;
    lastSentAtRef.current = now;
    onTranscript(cleaned);
  }

  function stopAllCapture() {
    whisperLoopRef.current = false;
    recognitionRef.current?.abort?.();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (mediaRef.current?.state === "recording") {
      try {
        mediaRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRef.current = null;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    stopLevelMeter();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startLiveBrowserSpeech() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return false;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (ev) => {
      if (disabledRef.current) return;
      let interim = "";
      let finalPiece = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const row = ev.results[i];
        const piece = row?.[0]?.transcript || "";
        if (row?.isFinal) finalPiece += piece;
        else interim += piece;
      }
      if (interim) onInterim?.(interim);
      if (finalPiece.trim()) {
        onInterim?.(finalPiece.trim());
        emitTranscript(finalPiece.trim());
      }
    };

    recognition.onerror = (ev) => {
      const err = ev?.error || "";
      if (err === "aborted" || err === "no-speech") return;
      if (err === "not-allowed") {
        setMicError("Microphone blocked — allow mic in browser settings");
        setLiveState(false);
        stopAllCapture();
      }
    };

    recognition.onend = () => {
      // Keep live session alive until user turns it off
      if (liveRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (!liveRef.current) return;
          try {
            recognition.start();
          } catch {
            /* already started */
          }
        }, disabledRef.current ? 900 : 280);
      }
    };

    recognitionRef.current = recognition;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startLevelMeter(stream);
    } catch {
      /* meter optional */
    }

    recognition.start();
    setModeLabel("live");
    setLiveState(true);
    setMicError(null);
    onInterim?.("Live talk on — just speak");
    return true;
  }

  async function startWhisperLiveLoop() {
    whisperLoopRef.current = true;
    setModeLabel("whisper");
    setLiveState(true);
    setMicError(null);
    onInterim?.("Live talk on — speak, pause to send");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const runSegment = () => {
      if (!whisperLoopRef.current || !liveRef.current) return;

      chunksRef.current = [];
      let heardSpeech = false;
      let recording = true;

      const recorder = new MediaRecorder(stream);
      mediaRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };

      const finishSegment = () => {
        if (!recording) return;
        recording = false;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        try {
          if (recorder.state === "recording") recorder.stop();
        } catch {
          /* ignore */
        }
      };

      startLevelMeter(stream, (loud) => {
        if (!recording || !whisperLoopRef.current) return;
        if (loud) {
          heardSpeech = true;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (heardSpeech) finishSegment();
          }, 1100);
        }
      });

      // Max segment length
      const maxTimer = setTimeout(() => {
        if (heardSpeech) finishSegment();
        else if (whisperLoopRef.current && liveRef.current) {
          // restart quiet segment
          finishSegment();
        }
      }, 10000);

      recorder.onstop = () => {
        clearTimeout(maxTimer);
        void (async () => {
          if (!whisperLoopRef.current) return;
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          if (blob.size > 1200 && heardSpeech && !disabledRef.current) {
            setUploading(true);
            onInterim?.("Transcribing…");
            try {
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
                onInterim?.(String(json.text));
                emitTranscript(String(json.text));
              }
            } finally {
              setUploading(false);
            }
          }
          // Continue live loop
          if (whisperLoopRef.current && liveRef.current) {
            setTimeout(runSegment, disabledRef.current ? 800 : 200);
          }
        })();
      };

      try {
        recorder.start();
      } catch {
        setMicError("Could not start live recording");
        setLiveState(false);
        stopAllCapture();
      }
    };

    runSegment();
  }

  async function toggleLive() {
    if (live) {
      setLiveState(false);
      stopAllCapture();
      onInterim?.("");
      return;
    }
    if (disabled) return;
    setMicError(null);

    // Prefer continuous browser speech (true live, auto-send on pause)
    try {
      const ok = await startLiveBrowserSpeech();
      if (ok) return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setMicError("Microphone blocked — allow mic in browser settings");
        return;
      }
    }

    // Fallback: Whisper segments with silence auto-send
    try {
      await startWhisperLiveLoop();
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone blocked — allow mic in browser settings"
          : "Could not start live talk";
      setMicError(msg);
      setLiveState(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={(!live && disabled) || uploading}
          onClick={() => void toggleLive()}
          className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2.5 border px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition sm:flex-none sm:min-w-[12.5rem] ${
            live
              ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300 shadow-[0_0_22px_rgba(52,211,153,0.35)]"
              : "border-[var(--color-accent)]/45 bg-[var(--color-accent-dim)] text-[var(--color-accent-2)] hover:border-[var(--color-accent)]"
          } disabled:opacity-40`}
          aria-pressed={live}
        >
          {live ? <MicOff size={20} /> : <Mic size={20} />}
          <span>{live ? "Live · On" : "Live Talk"}</span>
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
          {modeLabel === "live"
            ? " · auto-send"
            : modeLabel === "whisper"
              ? " · pause to send"
              : ""}
        </span>
      </div>

      {live ? (
        <p className="text-[11px] text-emerald-300/90">
          {uploading
            ? "Transcribing…"
            : "Listening live — speak naturally; Alpha sends when you pause. Tap Live again to stop."}
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
