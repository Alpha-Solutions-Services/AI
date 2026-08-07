import { requireAlphaStaff } from "@/lib/staff/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(req: Request) {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  const db = getServiceRoleClient();
  if (!db) {
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }

  const url = new URL(req.url);
  const site = url.searchParams.get("site") || "afn";
  const status = url.searchParams.get("status"); // open | human | closed | all

  let q = db
    .from("support_sessions")
    .select(
      "id, site_slug, status, page_url, lead_name, lead_email, lead_phone, lead_role, assigned_staff_email, last_message_at, created_at"
    )
    .eq("site_slug", site)
    .order("last_message_at", { ascending: false })
    .limit(80);

  if (status === "open") {
    q = q.in("status", ["bot", "queued", "human"]);
  } else if (status === "human") {
    q = q.eq("status", "human");
  } else if (status === "closed") {
    q = q.eq("status", "closed");
  } else if (status !== "all") {
    q = q.in("status", ["bot", "queued", "human"]);
  }

  const { data, error } = await q;
  if (error) {
    return Response.json({ error: "Could not list sessions" }, { status: 500 });
  }

  const ids = (data || []).map((s) => s.id);
  let lastBySession: Record<string, string> = {};
  if (ids.length) {
    const { data: msgs } = await db
      .from("support_messages")
      .select("session_id, content, role, created_at")
      .in("session_id", ids)
      .order("created_at", { ascending: false })
      .limit(200);
    for (const m of msgs || []) {
      const sid = m.session_id as string;
      if (!lastBySession[sid]) {
        lastBySession[sid] = `${m.role}: ${String(m.content).slice(0, 120)}`;
      }
    }
  }

  return Response.json({
    sessions: (data || []).map((s) => ({
      ...s,
      preview: lastBySession[s.id as string] || null,
    })),
  });
}
