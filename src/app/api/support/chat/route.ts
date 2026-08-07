import { z } from "zod";
import { getGroq, getGroqModel } from "@/lib/alpha/groq";
import { persistLeadFields } from "@/lib/support/db";
import { extractLeadFromText } from "@/lib/support/lead";
import { checkSupportRateLimit } from "@/lib/support/rate-limit";
import {
  guardPublicSupportRequest,
  jsonError,
  jsonOk,
} from "@/lib/support/security";
import { buildSupportSystemPrompt } from "@/lib/support/system-prompt";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const bodySchema = z.object({
  site: z.string().min(1).max(64),
  sessionId: z.string().uuid(),
  visitorToken: z.string().min(16).max(128),
  message: z.string().min(1).max(4000),
});

export async function OPTIONS(req: Request) {
  let site = "afn";
  try {
    const clone = req.clone();
    const j = (await clone.json()) as { site?: string };
    if (j?.site) site = j.site;
  } catch {
    /* ignore */
  }
  const gated = await guardPublicSupportRequest(req, site);
  if (gated instanceof Response) return gated;
  return new Response(null, { status: 204, headers: gated.cors });
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return jsonError(400, "Invalid request");

  const { site: siteSlug, sessionId, visitorToken, message } = parsed.data;
  const gated = await guardPublicSupportRequest(req, siteSlug);
  if (gated instanceof Response) return gated;

  const ok = await checkSupportRateLimit(
    `chat:${gated.ipHash}:${visitorToken.slice(0, 16)}`,
    20,
    60_000
  );
  if (!ok) return jsonError(429, "Too many requests", gated.cors);

  const db = getServiceRoleClient();
  if (!db) return jsonError(503, "Service unavailable", gated.cors);

  const { data: session } = await db
    .from("support_sessions")
    .select(
      "id, site_slug, visitor_token, status, page_url, lead_name, lead_email, lead_phone, lead_role"
    )
    .eq("id", sessionId)
    .eq("site_slug", siteSlug)
    .maybeSingle();

  if (
    !session ||
    session.visitor_token !== visitorToken ||
    session.status === "closed"
  ) {
    return jsonError(404, "Session not found", gated.cors);
  }

  const trimmed = message.trim();
  const now = new Date().toISOString();

  await db.from("support_messages").insert({
    session_id: sessionId,
    site_slug: siteSlug,
    role: "visitor",
    content: trimmed,
  });

  const extracted = extractLeadFromText(trimmed);
  const lead = await persistLeadFields(
    sessionId,
    siteSlug,
    gated.site.product,
    extracted
  );

  await db
    .from("support_sessions")
    .update({ last_message_at: now, updated_at: now })
    .eq("id", sessionId);

  // Human takeover: do not run bot
  if (session.status === "human" || session.status === "queued") {
    return jsonOk(
      {
        status: session.status,
        assistant: null,
        lead: lead || null,
        humanActive: session.status === "human",
      },
      gated.cors
    );
  }

  const groq = getGroq();
  if (!groq) {
    return jsonError(503, "Assistant unavailable", gated.cors);
  }

  const { data: history } = await db
    .from("support_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(40);

  const system = buildSupportSystemPrompt(gated.site, {
    pageUrl: session.page_url as string | null,
    lead: {
      name: lead?.name || (session.lead_name as string | null),
      email: lead?.email || (session.lead_email as string | null),
      phone: lead?.phone || (session.lead_phone as string | null),
      role: lead?.role || (session.lead_role as string | null),
    },
  });

  const messages = [
    { role: "system" as const, content: system },
    ...(history || [])
      .filter((m) => m.role === "visitor" || m.role === "assistant" || m.role === "staff")
      .map((m) => ({
        role:
          m.role === "visitor"
            ? ("user" as const)
            : ("assistant" as const),
        content:
          m.role === "staff"
            ? `[Staff]: ${m.content}`
            : (m.content as string),
      })),
  ];

  let assistantText =
    "Thanks for your message. A team member can follow up shortly — feel free to share your email or WhatsApp us.";

  try {
    // Re-check status before reply (race with staff Join)
    const { data: fresh } = await db
      .from("support_sessions")
      .select("status")
      .eq("id", sessionId)
      .maybeSingle();
    if (fresh?.status === "human" || fresh?.status === "queued") {
      return jsonOk(
        {
          status: fresh.status,
          assistant: null,
          lead: lead || null,
          humanActive: fresh.status === "human",
        },
        gated.cors
      );
    }

    const completion = await groq.chat.completions.create({
      model: getGroqModel(),
      temperature: 0.4,
      max_tokens: 700,
      messages,
    });
    assistantText =
      completion.choices[0]?.message?.content?.trim() || assistantText;
  } catch (err) {
    console.error("[support/chat] groq failed");
    return jsonError(502, "Assistant error", gated.cors);
  }

  await db.from("support_messages").insert({
    session_id: sessionId,
    site_slug: siteSlug,
    role: "assistant",
    content: assistantText,
  });

  await db
    .from("support_sessions")
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  return jsonOk(
    {
      status: "bot",
      assistant: assistantText,
      lead: lead || null,
      humanActive: false,
      onboard:
        gated.site.onboard_mode === "tms_carrier"
          ? {
              mode: "tms_carrier",
              url:
                process.env.NEXT_PUBLIC_TMS_URL?.trim() ||
                "https://tms.alphasolutions.software",
            }
          : null,
    },
    gated.cors
  );
}
