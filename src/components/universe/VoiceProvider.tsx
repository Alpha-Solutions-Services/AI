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
  startPtt: () => void;
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

function detectLang(): string {
  try {
    const nav = navigator.language || "en-US";
    if (/^ur/i.test(nav)) return "ur-PK";
    return "en-US";
  } catch {
    return "en-US";
  }
}

/**
 * VoiceProvider — Web Speech PTT with continuous capture while held,
 * so short pauses mid-sentence are not cut off.
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
  const finalBuf = useRef("");
  const interimBuf = useRef("");
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
    finalBuf.current = "";
    interimBuf.current = "";
    setInterim("");

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = detectLang();
    rec.onresult = (ev) => {
      let interimText = "";
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const row = ev.results[i];
        const piece = row?.[0]?.transcript || "";
        if (row?.isFinal) finalText += piece;
        else interimText += piece;
      }
      if (finalText) {
        finalBuf.current = `${finalBuf.current} ${finalText}`.trim();
      }
      interimBuf.current = interimText.trim();
      const display = [finalBuf.current, interimBuf.current]
        .filter(Boolean)
        .join(" ")
        .trim();
      setInterim(display);
    };
    rec.onerror = (ev) => {
      if (ev?.error === "aborted" || ev?.error === "no-speech") return;
      if (!pttActive.current) return;
      pttActive.current = false;
      setListening(false);
      stopMeter();
    };
    rec.onend = () => {
      // Keep listening while PTT held (browser often ends segments)
      if (pttActive.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through */
        }
      }
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
    pttActive.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setListening(false);
    stopMeter();

    const text = [finalBuf.current, interimBuf.current]
      .filter(Boolean)
      .join(" ")
      .trim();
    finalBuf.current = "";
    interimBuf.current = "";
    setInterim("");
    if (text.length >= 2) {
      // brief delay so last finals land
      window.setTimeout(() => onTranscriptRef.current?.(text), 120);
    }
  }, []);

  useEffect(() => {
    if (mode !== "wake" || !supported) return;
    setWakeAttempted(true);
    setWakeFallbackReason(
      "Wake word is experimental — using push-to-talk (hold mic)"
    );
    setMode("ptt");
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
