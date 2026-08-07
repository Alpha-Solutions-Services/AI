import { checkSupportRateLimit } from "@/lib/support/rate-limit";
import {
  guardPublicSupportRequest,
  jsonError,
  jsonOk,
} from "@/lib/support/security";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

type Params = { params: { id: string } };

export async function OPTIONS(req: Request, { params }: Params) {
  const url = new URL(req.url);
  const site = url.searchParams.get("site") || "afn";
  const gated = await guardPublicSupportRequest(req, site);
  if (gated instanceof Response) return gated;
  void params.id;
  return new Response(null, { status: 204, headers: gated.cors });
}

export async function GET(req: Request, { params }: Params) {
  const sessionId = params.id;
  const url = new URL(req.url);
  const siteSlug = url.searchParams.get("site") || "";
  const visitorToken = url.searchParams.get("visitorToken") || "";
  const after = url.searchParams.get("after");

  if (!siteSlug || visitorToken.length < 16) {
    return jsonError(400, "Invalid request");
  }

  const gated = await guardPublicSupportRequest(req, siteSlug);
  if (gated instanceof Response) return gated;

  const ok = await checkSupportRateLimit(
    `poll:${gated.ipHash}:${visitorToken.slice(0, 16)}`,
    60,
    60_000
  );
  if (!ok) return jsonError(429, "Too many requests", gated.cors);

  const db = getServiceRoleClient();
  if (!db) return jsonError(503, "Service unavailable", gated.cors);

  const { data: session } = await db
    .from("support_sessions")
    .select(
      "id, site_slug, visitor_token, status, lead_name, lead_email, lead_phone, lead_role, assigned_staff_email"
    )
    .eq("id", sessionId)
    .eq("site_slug", siteSlug)
    .maybeSingle();

  if (!session || session.visitor_token !== visitorToken) {
    return jsonError(404, "Session not found", gated.cors);
  }

  let q = db
    .from("support_messages")
    .select("id, role, content, created_at, meta")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (after) {
    q = q.gt("created_at", after);
  }

  const { data: messages, error } = await q;
  if (error) {
    return jsonError(500, "Could not load messages", gated.cors);
  }

  return jsonOk(
    {
      session: {
        id: session.id,
        status: session.status,
        lead: {
          name: session.lead_name,
          email: session.lead_email,
          phone: session.lead_phone,
          role: session.lead_role,
        },
        assignedStaffEmail: session.assigned_staff_email,
      },
      messages: messages || [],
    },
    gated.cors
  );
}
