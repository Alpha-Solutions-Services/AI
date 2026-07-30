import { NextRequest, NextResponse } from "next/server";
import { getGroq, getWhisperModel } from "@/lib/alpha/groq";
import { requireAlphaStaff } from "@/lib/staff/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  const groq = getGroq();
  if (!groq) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured" },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "audio file required" }, { status: 400 });
  }

  // No forced language — Whisper auto-detects English / Urdu / mixed.
  const transcription = await groq.audio.transcriptions.create({
    file,
    model: getWhisperModel(),
  });

  return NextResponse.json({ text: transcription.text });
}
