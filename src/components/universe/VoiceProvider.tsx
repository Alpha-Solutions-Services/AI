"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type VoiceMode = "off" | "ptt" | "wake";

type VoiceContextValue = {
  mode: VoiceMode;
  setMode: (m: VoiceMode) => void;
  listening: boolean;
  level: number;
  interim: string;
  supported: boolean;
  wakeAttempted: boolean;
  wakeFallbackReason: string | null;
  /** Push-to-talk: start */
  startPtt: () => void;
  /** Push-to-talk: stop & emit final transcript */
  stopPtt: () => void;
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeak: () => void;
  speaking: boolean;
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((ev: {
    resultIndex: number;
    results: {
      length: number;
      [i: number]: { isFinal?: boolean; 0: { transcript: string } };
    };
  }) => void) | null;
  onerror: ((ev?: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

/**
 * VoiceProvider — Web Speech baseline.
 * Swap internals later for OpenAI Realtime / Gemini Live without touching UI.
 */
export function VoiceProvider({
  children,
  onTranscript,
  onLevel,
}: {
  children: ReactNode;
  onTranscript?: (text: string) => void;
  onLevel?: (level: number) => void;
}) {
  const [mode, setMode] = useState<VoiceMode>("ptt");
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [interim, setInterim] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [wakeAttempted, setWakeAttempted] = useState(false);
  const [wakeFallbackReason, setWakeFallbackReason] = useState<string | null>(
    null
  );

  const recRef = useRef<SpeechRec | null>(null);
  const pttActive = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const analyserRaf = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const w = window as Window & {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  function stopMeter() {
    if (analyserRaf.current) cancelAnimationFrame(analyserRaf.current);
    analyserRaf.current = 0;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLevel(0);
    onLevel?.(0);
  }

  async function startMeter() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      void ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      audioCtxRef.current = ctx;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = Math.min(1, (sum / data.length / 255) * 2.5);
        setLevel(avg);
        onLevel?.(avg);
        analyserRaf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* optional */
    }
  }

  const startPtt = useCallback(() => {
    const w = window as Window & {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor || pttActive.current) return;
    pttActive.current = true;
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (ev) => {
      let interimText = "";
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const row = ev.results[i];
        const piece = row?.[0]?.transcript || "";
        if (row?.isFinal) finalText += piece;
        else interimText += piece;
      }
      if (interimText) setInterim(interimText);
      if (finalText.trim()) {
        setInterim(finalText.trim());
        onTranscriptRef.current?.(finalText.trim());
      }
    };
    rec.onerror = () => {
      pttActive.current = false;
      setListening(false);
      stopMeter();
    };
    rec.onend = () => {
      pttActive.current = false;
      setListening(false);
      stopMeter();
    };
    recRef.current = rec;
    void startMeter();
    try {
      rec.start();
      setListening(true);
    } catch {
      pttActive.current = false;
    }
  }, []);

  const stopPtt = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    pttActive.current = false;
    setListening(false);
    stopMeter();
  }, []);

  // Wake-word attempt — fall back to PTT if unreliable
  useEffect(() => {
    if (mode !== "wake" || !supported) return;
    setWakeAttempted(true);
    const w = window as Window & {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setWakeFallbackReason("SpeechRecognition unavailable");
      setMode("ptt");
      return;
    }

    let stopped = false;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    let errors = 0;

    rec.onresult = (ev) => {
      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i]?.[0]?.transcript || "";
      }
      const lower = text.toLowerCase();
      if (/\balpha\b/.test(lower)) {
        const rest = lower.replace(/^.*\balpha\b[,:]?\s*/i, "").trim();
        if (rest.length > 2) onTranscriptRef.current?.(rest);
        else {
          // wake only — start PTT-style capture
          setInterim("Listening…");
        }
      }
    };
    rec.onerror = (ev) => {
      errors += 1;
      if (errors >= 2 || ev?.error === "not-allowed") {
        setWakeFallbackReason(
          `Wake mode unreliable (${ev?.error || "errors"}) — using push-to-talk`
        );
        setMode("ptt");
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
    };
    rec.onend = () => {
      if (!stopped && mode === "wake") {
        try {
          rec.start();
        } catch {
          setWakeFallbackReason("Wake recognition ended — using push-to-talk");
          setMode("ptt");
        }
      }
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setWakeFallbackReason("Could not start wake recognition — using PTT");
      setMode("ptt");
    }

    return () => {
      stopped = true;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      setListening(false);
    };
  }, [mode, supported]);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 1600));
    u.rate = 1.05;
    u.onstart = () => setSpeaking(true);
    u.onend = () => {
      setSpeaking(false);
      onEnd?.();
    };
    u.onerror = () => {
      setSpeaking(false);
      onEnd?.();
    };
    setTimeout(() => window.speechSynthesis.speak(u), 40);
  }, []);

  const stopSpeak = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const value: VoiceContextValue = {
    mode,
    setMode,
    listening,
    level,
    interim,
    supported,
    wakeAttempted,
    wakeFallbackReason,
    startPtt,
    stopPtt,
    speak,
    stopSpeak,
    speaking,
  };

  return (
    <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within VoiceProvider");
  return ctx;
}
