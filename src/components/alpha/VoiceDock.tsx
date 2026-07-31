"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
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
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
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
  onBargeIn,
  agentSpeaking = false,
}: {
  disabled?: boolean;
  speakEnabled: boolean;
  onSpeakEnabledChange: (v: boolean) => void;
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  onLevel?: (level: number) => void;
  /** Fired when user starts speaking — stop TTS so live talk feels instant */
  onBargeIn?: () => void;
  /** True while Alpha TTS is playing — ignore mic feedback so replies aren't cut off */
  agentSpeaking?: boolean;
}) {
  const [live, setLive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [modeLabel, setModeLabel] = useState<"live" | "whisper" | null>(null);

  const liveRef = useRef(false);
  const disabledRef = useRef(!!disabled);
  const agentSpeakingRef = useRef(agentSpeaking);
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
  const interimBufRef = useRef("");
  const interimFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bargedRef = useRef(false);
  const onBargeInRef = useRef(onBargeIn);
  const onTranscriptRef = useRef(onTranscript);
  const onInterimRef = useRef(onInterim);

  useEffect(() => {
    disabledRef.current = !!disabled;
  }, [disabled]);

  useEffect(() => {
    agentSpeakingRef.current = agentSpeaking;
    // Pause recognition while Alpha talks so speakers don't cancel TTS
    if (agentSpeaking && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
  }, [agentSpeaking]);

  useEffect(() => {
    onBargeInRef.current = onBargeIn;
  }, [onBargeIn]);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onInterimRef.current = onInterim;
  }, [onInterim]);

  useEffect(() => {
    return () => {
      liveRef.current = false;
      whisperLoopRef.current = false;
      recognitionRef.current?.abort?.();
      recognitionRef.current?.stop();
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (interimFlushRef.current) clearTimeout(interimFlushRef.current);
      stopLevelMeter();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function setLiveState(v: boolean) {
    liveRef.current = v;
    setLive(v);
    onListeningChange?.(v);
    if (!v) {
      onInterimRef.current?.("");
      onLevel?.(0);
      setModeLabel(null);
      interimBufRef.current = "";
      bargedRef.current = false;
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
      void ctx.resume().catch(() => undefined);
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.55;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;
        onLevel?.(Math.min(1, avg * 3.2));
        onLoud?.(avg > 0.038);
        levelRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* optional */
    }
  }

  function signalBargeIn() {
    // Don't treat Alpha's own speaker output as user barge-in
    if (agentSpeakingRef.current) return;
    if (bargedRef.current) return;
    bargedRef.current = true;
    onBargeInRef.current?.();
  }

  function emitTranscript(text: string) {
    const cleaned = text.trim();
    if (!cleaned || cleaned.length < 2) return;
    if (agentSpeakingRef.current) return;
    // Drop while a reply is still generating — keep mic hot, retry soon via pause flush
    if (disabledRef.current) return;
    const now = Date.now();
    if (cleaned === lastSentRef.current && now - lastSentAtRef.current < 2200) {
      return;
    }
    lastSentRef.current = cleaned;
    lastSentAtRef.current = now;
    interimBufRef.current = "";
    bargedRef.current = false;
    onTranscriptRef.current(cleaned);
  }

  function scheduleInterimFlush() {
    if (interimFlushRef.current) clearTimeout(interimFlushRef.current);
    // Fast pause → send (browsers can be slow with isFinal)
    interimFlushRef.current = setTimeout(() => {
      const buf = interimBufRef.current.trim();
      if (!buf || buf.length < 2) return;
      if (disabledRef.current) {
        // Retry quickly once generation finishes
        scheduleInterimFlush();
        return;
      }
      interimBufRef.current = "";
      emitTranscript(buf);
    }, 1600);
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
    if (interimFlushRef.current) clearTimeout(interimFlushRef.current);
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
    recognition.maxAlternatives = 1;

    recognition.onspeechstart = () => {
      signalBargeIn();
    };

    recognition.onresult = (ev) => {
      let interim = "";
      let finalPiece = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const row = ev.results[i];
        const piece = row?.[0]?.transcript || "";
        if (row?.isFinal) finalPiece += piece;
        else interim += piece;
      }

      if (interim || finalPiece) signalBargeIn();

      if (interim) {
        interimBufRef.current = interim.trim();
        onInterimRef.current?.(interimBufRef.current);
        scheduleInterimFlush();
      }

      if (finalPiece.trim()) {
        if (interimFlushRef.current) clearTimeout(interimFlushRef.current);
        interimBufRef.current = "";
        onInterimRef.current?.(finalPiece.trim());
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
      // Keep live session alive — wait while Alpha is speaking so TTS isn't interrupted
      if (liveRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        const wait = () => {
          if (!liveRef.current) return;
          if (agentSpeakingRef.current || disabledRef.current) {
            restartTimerRef.current = setTimeout(wait, 400);
            return;
          }
          try {
            recognition.start();
          } catch {
            /* already started */
          }
        };
        restartTimerRef.current = setTimeout(wait, 120);
      }
    };

    recognitionRef.current = recognition;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      startLevelMeter(stream, (loud) => {
        if (loud) signalBargeIn();
      });
    } catch {
      /* meter optional */
    }

    recognition.start();
    setModeLabel("live");
    setLiveState(true);
    setMicError(null);
    onInterimRef.current?.("Live talk on — just speak");
    return true;
  }

  async function startWhisperLiveLoop() {
    whisperLoopRef.current = true;
    setModeLabel("whisper");
    setLiveState(true);
    setMicError(null);
    onInterimRef.current?.("Live talk on — speak, pause to send");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;

    const mime =
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

    const runSegment = () => {
      if (!whisperLoopRef.current || !liveRef.current) return;

      chunksRef.current = [];
      let heardSpeech = false;
      let recording = true;

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: mime });
      } catch {
        recorder = new MediaRecorder(stream);
      }
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
          signalBargeIn();
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          // Longer pause so mid-sentence breath doesn't cut words
          silenceTimerRef.current = setTimeout(() => {
            if (heardSpeech) finishSegment();
          }, 1400);
        }
      });

      // Longer max segment for full sentences
      const maxTimer = setTimeout(() => {
        if (heardSpeech) finishSegment();
        else if (whisperLoopRef.current && liveRef.current) {
          finishSegment();
        }
      }, 15000);

      recorder.onstop = () => {
        clearTimeout(maxTimer);
        void (async () => {
          if (!whisperLoopRef.current) return;
          const blob = new Blob(chunksRef.current, { type: mime });
          if (blob.size > 800 && heardSpeech) {
            if (disabledRef.current) {
              // Wait briefly for reply to finish, then resume loop without upload
              setTimeout(() => {
                if (whisperLoopRef.current && liveRef.current) runSegment();
              }, 200);
              return;
            }
            setUploading(true);
            onInterimRef.current?.("Transcribing…");
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
                onInterimRef.current?.(String(json.text));
                emitTranscript(String(json.text));
              }
            } finally {
              setUploading(false);
            }
          }
          // Continue live loop immediately
          if (whisperLoopRef.current && liveRef.current) {
            setTimeout(runSegment, 60);
          }
        })();
      };

      try {
        recorder.start(250);
      } catch {
        try {
          recorder.start();
        } catch {
          setMicError("Could not start live recording");
          setLiveState(false);
          stopAllCapture();
        }
      }
    };

    runSegment();
  }

  async function toggleLive() {
    if (live) {
      setLiveState(false);
      stopAllCapture();
      onInterimRef.current?.("");
      return;
    }
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
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <button
          type="button"
          disabled={uploading}
          onClick={() => void toggleLive()}
          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition sm:min-h-12 sm:w-auto sm:min-w-[11rem] sm:gap-2.5 sm:px-4 sm:py-3.5 sm:text-sm sm:tracking-[0.14em] ${
            live
              ? "border-emerald-400/45 bg-emerald-400/15 text-emerald-300 shadow-[0_0_32px_rgba(52,211,153,0.28)] backdrop-blur-xl"
              : "glass-strong border-[var(--color-accent)]/40 text-[var(--color-accent-2)] hover:border-[var(--color-accent)]"
          } disabled:opacity-40`}
          aria-pressed={live}
        >
          {live ? <MicOff size={18} /> : <Mic size={18} />}
          <span className="truncate">{live ? "Live · On" : "Live Talk"}</span>
        </button>

        <button
          type="button"
          onClick={() => onSpeakEnabledChange(!speakEnabled)}
          className={`glass-chip inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-3 text-xs uppercase tracking-wider sm:h-12 sm:w-auto sm:px-3.5 ${
            speakEnabled
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-muted)]"
          }`}
          title={speakEnabled ? "Mute Alpha voice" : "Enable spoken replies"}
        >
          {speakEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{speakEnabled ? "TTS on" : "TTS off"}</span>
        </button>

        <span className="col-span-2 text-center text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)] sm:col-span-1 sm:text-left">
          EN · اردو
          {modeLabel === "live"
            ? " · auto-send"
            : modeLabel === "whisper"
              ? " · pause to send"
              : ""}
        </span>
      </div>

      {live ? (
        <p className="text-[11px] leading-snug text-emerald-300/90">
          {uploading
            ? "Transcribing…"
            : disabled
              ? "Listening — will send after Alpha finishes"
              : "Listening — speak, pause to send. Tap Live again to stop."}
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

  const speakNow = () => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 1600));
    utter.rate = 1.05;
    utter.pitch = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const wantUrdu = hasUrduScript(text);
    const preferred = wantUrdu
      ? voices.find((v) => /ur|pak|hindi|india/i.test(`${v.lang} ${v.name}`)) ||
        voices.find((v) => v.lang.startsWith("ur"))
      : voices.find((v) => /en-GB|Daniel|Google UK|Samantha|Jenny/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utter.voice = preferred;
    if (wantUrdu) utter.lang = preferred?.lang || "ur-PK";
    else utter.lang = preferred?.lang || "en-US";

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
    // Small delay after cancel so Chrome actually speaks
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utter);
      } catch {
        opts?.onEnd?.();
      }
    }, 60);
  };

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    const onVoices = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      speakNow();
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoices);
    // Fallback if voiceschanged never fires
    setTimeout(speakNow, 250);
  } else {
    speakNow();
  }
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
