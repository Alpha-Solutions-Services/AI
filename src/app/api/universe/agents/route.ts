import { NextResponse } from "next/server";
import {
  UNIVERSE_AGENTS,
  type AgentRuntimeStatus,
} from "@/config/agents.config";
import { requireAlphaStaff } from "@/lib/staff/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

/**
 * Agent satellite statuses derived from real alpha_tool_runs — not fake timers.
 */
export async function GET() {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  const db = getServiceRoleClient();
  const byAgent: Record<
    string,
    { status: AgentRuntimeStatus; task: string | null; recent: string[] }
  > = {};

  for (const a of UNIVERSE_AGENTS) {
    byAgent[a.id] = { status: "idle", task: null, recent: [] };
  }

  if (db) {
    const { data } = await db
      .from("alpha_tool_runs")
      .select("id, tool_name, status, created_at, args")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(40);

    const rows = data || [];
    for (const row of rows) {
      const tool = String(row.tool_name || "");
      const agentId =
        tool.startsWith("tms_")
          ? "dispatch"
          : tool.startsWith("portal_")
            ? "portal"
            : tool.startsWith("ld_")
              ? "learn"
              : tool.startsWith("ops_")
                ? tool.includes("knowledge")
                  ? "knowledge"
                  : "ops"
                : tool.startsWith("web_")
                  ? "ops"
                  : null;
      if (!agentId || !byAgent[agentId]) continue;

      const st = String(row.status);
      if (st === "pending" && byAgent[agentId].status === "idle") {
        byAgent[agentId] = {
          status: "needs_approval",
          task: `Awaiting confirm: ${tool}`,
          recent: byAgent[agentId].recent,
        };
      } else if (
        (st === "executed" || st === "failed") &&
        byAgent[agentId].recent.length < 5
      ) {
        byAgent[agentId].recent.push(
          `${tool} · ${st} · ${new Date(row.created_at).toLocaleTimeString()}`
        );
      }
    }

    // If chat is mid-flight we don't track here — CommandBar sets processing via provider
  }

  return NextResponse.json({
    agents: UNIVERSE_AGENTS.map((a) => ({
      ...a,
      runtime: byAgent[a.id],
    })),
  });
}
