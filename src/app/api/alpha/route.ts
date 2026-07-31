import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { matchIntent } from "@/lib/universe/intents";
import { requireAlphaStaff } from "@/lib/staff/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Universe Alpha entry — does NOT replace /api/chat.
 * Resolves navigation/quick intents locally, otherwise proxies to /api/chat
 * (same Groq + tools backbone) with planet context prepended.
 */
const schema = z.object({
  message: z.string().min(1).max(8000),
  conversationId: z.string().uuid().optional(),
  context: z
    .object({
      activePlanet: z.string().nullable().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const intent = matchIntent(
    parsed.message,
    parsed.context?.activePlanet ?? null
  );

  if (intent && intent.action.type !== "chat") {
    return NextResponse.json({
      reply: intent.reply || "Done.",
      intent: intent.id,
      action: intent.action,
      requiresConfirmation: intent.requiresConfirmation ?? false,
      confirmationLabel: intent.confirmationLabel,
      conversationId: parsed.conversationId ?? null,
      pendingConfirms: [],
      source: "intent",
    });
  }

  const planet = parsed.context?.activePlanet;
  const enriched =
    planet && planet !== "null"
      ? `[Universe context: active planet = ${planet}]\n${parsed.message}`
      : parsed.message;

  const origin = req.nextUrl.origin;
  const cookie = req.headers.get("cookie") || "";
  const chatRes = await fetch(`${origin}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie,
    },
    body: JSON.stringify({
      message: enriched,
      conversationId: parsed.conversationId,
    }),
  });

  const raw = await chatRes.text();
  let json: Record<string, unknown> = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json(
      { error: "Chat backbone returned invalid JSON" },
      { status: 502 }
    );
  }

  if (!chatRes.ok) {
    return NextResponse.json(json, { status: chatRes.status });
  }

  return NextResponse.json({
    ...json,
    intent: intent?.id ?? null,
    action: intent?.requiresConfirmation
      ? { type: "chat" }
      : undefined,
    requiresConfirmation: intent?.requiresConfirmation ?? false,
    confirmationLabel: intent?.confirmationLabel,
    source: "chat",
  });
}
