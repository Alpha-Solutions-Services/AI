/**
 * Shared TTS helpers — multi-language voice selection that actually speaks.
 * Chrome often has no ur-PK voice; fall back to hi-IN / ar for Arabic script.
 */

export type SpeechLangHint = "auto" | "en" | "ur" | "hi" | "ar";

export function hasArabicScript(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

export function detectSpeechHint(text: string): Exclude<SpeechLangHint, "auto"> {
  if (hasArabicScript(text)) {
    // Urdu + Arabic share script; prefer Urdu for Alpha bilingual staff use
    if (/[\u06A9\u06AF\u06BE\u06C1\u06D2\u0679\u0688\u0691]/.test(text)) return "ur";
    return "ur";
  }
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}

export function sttLocaleForHint(hint: SpeechLangHint): string {
  switch (hint) {
    case "ur":
      return "ur-PK";
    case "hi":
      return "hi-IN";
    case "ar":
      return "ar-SA";
    case "en":
      return "en-US";
    default:
      return "en-US";
  }
}

function scoreVoice(
  v: SpeechSynthesisVoice,
  hint: Exclude<SpeechLangHint, "auto">
): number {
  const key = `${v.lang} ${v.name}`.toLowerCase();
  let score = 0;
  if (hint === "ur") {
    if (/^ur/.test(v.lang)) score += 100;
    if (/urdu|pakistan/.test(key)) score += 80;
    if (/^hi/.test(v.lang) || /hindi|india/.test(key)) score += 50;
    if (/^ar/.test(v.lang) || /arabic/.test(key)) score += 30;
  } else if (hint === "hi") {
    if (/^hi/.test(v.lang)) score += 100;
    if (/hindi/.test(key)) score += 80;
  } else if (hint === "ar") {
    if (/^ar/.test(v.lang)) score += 100;
  } else {
    if (/^en/.test(v.lang)) score += 60;
    if (/en-us|en-gb/.test(v.lang)) score += 20;
    if (/google|microsoft|natural|neural|samantha|jenny|aria|guy/.test(key))
      score += 25;
  }
  if (v.localService) score += 5;
  if (/google/.test(key)) score += 10;
  return score;
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  hint: SpeechLangHint,
  text = ""
): { voice: SpeechSynthesisVoice | null; lang: string } {
  const resolved =
    hint === "auto" ? detectSpeechHint(text) : hint;
  const lang = sttLocaleForHint(resolved);
  if (!voices.length) return { voice: null, lang };

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const s = scoreVoice(v, resolved);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return {
    voice: bestScore > 0 ? best : voices.find((v) => v.default) || voices[0] || null,
    lang: best?.lang || lang,
  };
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }
  const existing = window.speechSynthesis.getVoices();
  if (existing.length) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(window.speechSynthesis.getVoices());
    };
    const onChange = () => finish();
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    // Chrome sometimes needs a tick
    setTimeout(finish, 400);
  });
}

let resumeTimer: ReturnType<typeof setInterval> | null = null;

function startChromeKeepAlive() {
  if (typeof window === "undefined" || resumeTimer) return;
  // Chrome bug: TTS pauses after ~15s unless resumed
  resumeTimer = setInterval(() => {
    try {
      if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else if (window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      }
    } catch {
      /* ignore */
    }
  }, 4000);
}

function stopChromeKeepAlive() {
  if (resumeTimer) {
    clearInterval(resumeTimer);
    resumeTimer = null;
  }
}

export async function speakSmart(
  text: string,
  opts?: {
    hint?: SpeechLangHint;
    onStart?: () => void;
    onEnd?: () => void;
    onBoundary?: (progress: number) => void;
  }
) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    opts?.onEnd?.();
    return;
  }

  const clean = text.replace(/\s+/g, " ").trim().slice(0, 1800);
  if (!clean) {
    opts?.onEnd?.();
    return;
  }

  const voices = await loadVoices();
  const { voice, lang } = pickVoice(voices, opts?.hint || "auto", clean);

  window.speechSynthesis.cancel();
  await new Promise((r) => setTimeout(r, 80));

  const utter = new SpeechSynthesisUtterance(clean);
  utter.rate = 1.02;
  utter.pitch = 1;
  utter.lang = lang;
  if (voice) utter.voice = voice;

  const len = Math.max(1, clean.length);
  utter.onboundary = (ev) => {
    const charIndex = typeof ev.charIndex === "number" ? ev.charIndex : 0;
    opts?.onBoundary?.(Math.min(1, charIndex / len));
  };
  utter.onstart = () => {
    startChromeKeepAlive();
    opts?.onStart?.();
    opts?.onBoundary?.(0.1);
  };
  const end = () => {
    stopChromeKeepAlive();
    opts?.onBoundary?.(0);
    opts?.onEnd?.();
  };
  utter.onend = end;
  utter.onerror = end;

  try {
    window.speechSynthesis.speak(utter);
    // Nudge Chrome to start
    window.speechSynthesis.resume();
  } catch {
    end();
  }
}

export function stopSmartSpeak() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  stopChromeKeepAlive();
  window.speechSynthesis.cancel();
}
