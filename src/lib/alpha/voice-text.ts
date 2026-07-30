/** Collapse repeated voice-transcript phrases / words. */
export function cleanVoiceTranscript(input: string): string {
  let t = input.replace(/\s+/g, " ").trim();
  if (!t) return t;

  // Exact doubled/tripled whole string
  for (let copies = 4; copies >= 2; copies--) {
    const len = Math.floor(t.length / copies);
    if (len < 6) continue;
    const unit = t.slice(0, len).trim();
    if (!unit) continue;
    const rebuilt = Array(copies).fill(unit).join(" ");
    if (rebuilt.replace(/\s+/g, " ") === t) return unit;
  }

  // Sliding phrase repeat: "hello hello hello"
  const words = t.split(" ");
  if (words.length >= 4) {
    for (let phraseLen = Math.min(8, Math.floor(words.length / 2)); phraseLen >= 2; phraseLen--) {
      const phrase = words.slice(0, phraseLen).join(" ");
      let i = 0;
      let repeats = 0;
      while (i + phraseLen <= words.length) {
        const chunk = words.slice(i, i + phraseLen).join(" ");
        if (chunk === phrase) {
          repeats += 1;
          i += phraseLen;
        } else break;
      }
      if (repeats >= 2 && i >= words.length - 1) return phrase;
    }
  }

  // Consecutive duplicate words
  t = t.replace(/(\S+)(?:\s+\1)+/gi, "$1");
  return t.trim();
}

/** True when user is mainly checking the mic / greeting Alpha. */
export function isHearingCheck(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /can you hear|do you hear|are you (there|listening)|hello alpha|hey alpha|testing|test mic/i.test(
      t
    ) ||
    /سن\s*سکتے|سن\s*رہے|سن\s*رہی|آواز\s*آرہی|مجھے\s*سن|ہلو|ہیلو|ٹیسٹ/.test(text)
  );
}
