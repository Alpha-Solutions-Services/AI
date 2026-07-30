import Groq from "groq-sdk";

export function getGroq(): Groq | null {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;
  return new Groq({ apiKey: key });
}

export function getGroqModel() {
  return process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
}

export function getWhisperModel() {
  return process.env.GROQ_WHISPER_MODEL?.trim() || "whisper-large-v3";
}
