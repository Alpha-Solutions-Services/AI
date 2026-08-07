import { z } from "zod";
import { persistLeadFields } from "@/lib/support/db";
import { checkSupportRateLimit } from "@/lib/support/rate-limit";
import {
  guardPublicSupportRequest,
  jsonError,
  jsonOk,
} from "@/lib/support/security";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const bodySchema = z.object({
  site: z.string().min(1).max(64),
  sessionId: z.string().uuid(),
  visitorToken: z.string().min(16).max(128),
  name: z.string().max(120).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  role: z.string().max(64).optional().nullable(),
  intent: z.string().max(200).optional().nullable(),
});

export async function OPTIONS(req: Request) {
  const gated = await guardPublicSupportRequest(req, "afn");
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

  const data = parsed.data;
  const gated = await guardPublicSupportRequest(req, data.site);
  if (gated instanceof Response) return gated;

  const ok = await checkSupportRateLimit(
    `lead:${gated.ipHash}:${data.visitorToken.slice(0, 16)}`,
    15,
    60_000
  );
  if (!ok) return jsonError(429, "Too many requests", gated.cors);

  const db = getServiceRoleClient();
  if (!db) return jsonError(503, "Service unavailable", gated.cors);

  const { data: session } = await db
    .from("support_sessions")
    .select("id, visitor_token, status")
    .eq("id", data.sessionId)
    .eq("site_slug", data.site)
    .maybeSingle();

  if (!session || session.visitor_token !== data.visitorToken) {
    return jsonError(404, "Session not found", gated.cors);
  }

  const lead = await persistLeadFields(
    data.sessionId,
    data.site,
    gated.site.product,
    {
      name: data.name || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      role: data.role || undefined,
    },
    data.intent
  );

  return jsonOk({ lead }, gated.cors);
}
