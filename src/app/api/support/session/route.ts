import { z } from "zod";
import { checkSupportRateLimit } from "@/lib/support/rate-limit";
import {
  guardPublicSupportRequest,
  jsonError,
  jsonOk,
} from "@/lib/support/security";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const bodySchema = z.object({
  site: z.string().min(1).max(64),
  visitorToken: z.string().min(16).max(128),
  pageUrl: z.string().url().max(2000).optional().nullable(),
  userAgent: z.string().max(500).optional().nullable(),
});

export async function OPTIONS(req: Request) {
  const site =
    req.headers.get("x-support-site-slug") ||
    new URL(req.url).searchParams.get("site") ||
    "afn";
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
  if (!parsed.success) {
    return jsonError(400, "Invalid request");
  }

  const { site: siteSlug, visitorToken, pageUrl, userAgent } = parsed.data;
  const gated = await guardPublicSupportRequest(req, siteSlug);
  if (gated instanceof Response) return gated;

  const ok = await checkSupportRateLimit(
    `session:${gated.ipHash}:${visitorToken.slice(0, 16)}`,
    30,
    60_000
  );
  if (!ok) return jsonError(429, "Too many requests", gated.cors);

  const db = getServiceRoleClient();
  if (!db) return jsonError(503, "Service unavailable", gated.cors);

  const { data: existing } = await db
    .from("support_sessions")
    .select(
      "id, site_slug, visitor_token, status, page_url, lead_name, lead_email, lead_phone, lead_role, lead_intent, assigned_staff_email, last_message_at, created_at"
    )
    .eq("visitor_token", visitorToken)
    .eq("site_slug", siteSlug)
    .in("status", ["bot", "queued", "human"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (pageUrl && pageUrl !== existing.page_url) {
      await db
        .from("support_sessions")
        .update({
          page_url: pageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
    return jsonOk(
      {
        session: {
          ...existing,
          page_url: pageUrl || existing.page_url,
        },
        resumed: true,
        site: {
          slug: gated.site.slug,
          displayName: gated.site.display_name,
          whatsappUrl: gated.site.whatsapp_url,
          onboardMode: gated.site.onboard_mode,
        },
      },
      gated.cors
    );
  }

  const { data: created, error } = await db
    .from("support_sessions")
    .insert({
      site_slug: siteSlug,
      visitor_token: visitorToken,
      status: "bot",
      page_url: pageUrl || null,
      user_agent: userAgent || null,
      ip_hash: gated.ipHash,
    })
    .select(
      "id, site_slug, visitor_token, status, page_url, lead_name, lead_email, lead_phone, lead_role, lead_intent, assigned_staff_email, last_message_at, created_at"
    )
    .single();

  if (error || !created) {
    console.error("[support/session] create failed", error?.message);
    return jsonError(500, "Could not create session", gated.cors);
  }

  await db.from("support_messages").insert({
    session_id: created.id,
    site_slug: siteSlug,
    role: "assistant",
    content:
      "Hi — I'm the AFN support assistant. Ask about dispatching, rates, compliance, or getting started. You can also share your name and email so our team can follow up.",
    meta: { kind: "greeting" },
  });

  return jsonOk(
    {
      session: created,
      resumed: false,
      site: {
        slug: gated.site.slug,
        displayName: gated.site.display_name,
        whatsappUrl: gated.site.whatsapp_url,
        onboardMode: gated.site.onboard_mode,
      },
    },
    gated.cors,
    201
  );
}
