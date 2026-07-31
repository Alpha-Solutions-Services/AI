import { NextResponse } from "next/server";
import { requireAlphaStaff } from "@/lib/staff/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

/**
 * Live Universe chrome metrics — real counts, no mock revenue/load theater.
 */
export async function GET() {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  const db = getServiceRoleClient();
  if (!db) {
    return NextResponse.json({
      ok: false,
      configured: false,
      overview: [],
      activity: [],
      health: { percent: 0, label: "Not configured", activeProcesses: 0 },
      badges: { notifications: 0, messages: 0, tasks: 0 },
    });
  }

  const [
    loadsRes,
    ticketsRes,
    docsRes,
    runsRes,
    sessionsRes,
  ] = await Promise.all([
    db
      .from("dispatch_loads")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    db
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .neq("status", "closed"),
    db.from("alpha_documents").select("id", { count: "exact", head: true }),
    db
      .from("alpha_tool_runs")
      .select("id, tool_name, status, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(12),
    db
      .from("academy_live_sessions")
      .select("id", { count: "exact", head: true }),
  ]);

  const activeLoads = loadsRes.count ?? 0;
  const openTickets = ticketsRes.count ?? 0;
  const docs = docsRes.count ?? 0;
  const liveSessions = sessionsRes.count ?? 0;
  const pendingRuns =
    (runsRes.data || []).filter((r) => r.status === "pending").length;

  const modulesOnline = 4; // dispatch + portal + learn + knowledge paths exist
  const healthPercent = Math.min(
    100,
    70 + (docs > 0 ? 8 : 0) + (activeLoads > 0 ? 8 : 0) + (openTickets >= 0 ? 6 : 0) + (pendingRuns === 0 ? 8 : 0)
  );

  const overview = [
    {
      id: "loads",
      label: "Active Loads",
      value: String(activeLoads),
      delta: 0,
    },
    {
      id: "tickets",
      label: "Open Tickets",
      value: String(openTickets),
      delta: 0,
    },
    {
      id: "knowledge",
      label: "Docs Indexed",
      value: String(docs),
      delta: 0,
    },
    {
      id: "academy",
      label: "Live Sessions",
      value: String(liveSessions),
      delta: 0,
    },
  ];

  const activity = (runsRes.data || []).map((r) => ({
    id: r.id,
    type: "agent" as const,
    title: String(r.tool_name || "tool"),
    detail: `Status: ${r.status}`,
    createdAt: r.created_at,
    planetId:
      String(r.tool_name || "").startsWith("tms_")
        ? "dispatch"
        : String(r.tool_name || "").startsWith("portal_")
          ? "portal"
          : String(r.tool_name || "").startsWith("ld_")
            ? "learn-academy"
            : "intelligence",
  }));

  return NextResponse.json({
    ok: true,
    configured: true,
    overview,
    activity,
    health: {
      percent: healthPercent,
      label: pendingRuns ? "Awaiting confirmations" : "Systems nominal",
      activeProcesses: modulesOnline + pendingRuns,
    },
    badges: {
      notifications: pendingRuns,
      messages: 0,
      tasks: openTickets,
    },
  });
}
