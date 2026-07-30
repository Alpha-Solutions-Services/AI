import { learnDispatchTools } from "@/lib/alpha/tools/learndispatch";
import { opsTools } from "@/lib/alpha/tools/ops";
import { portalTools } from "@/lib/alpha/tools/portal";
import { tmsTools } from "@/lib/alpha/tools/tms";
import type { AlphaTool, ToolContext, ToolResult } from "@/lib/alpha/tools/types";
import { groqToolDefs } from "@/lib/alpha/tools/types";
import { webTools } from "@/lib/alpha/tools/web";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const ALL_TOOLS: AlphaTool[] = [
  ...portalTools,
  ...tmsTools,
  ...learnDispatchTools,
  ...opsTools,
  ...webTools,
];

const byName = new Map(ALL_TOOLS.map((t) => [t.name, t]));

export function listAlphaTools() {
  return ALL_TOOLS;
}

export function getAlphaTool(name: string) {
  return byName.get(name);
}

export function alphaGroqTools() {
  return groqToolDefs(ALL_TOOLS);
}

export async function runToolImmediate(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  const tool = byName.get(name);
  if (!tool) {
    return { ok: false, summary: `Unknown tool: ${name}`, error: "unknown_tool" };
  }
  try {
    return await tool.execute(args, ctx);
  } catch (err) {
    return {
      ok: false,
      summary: `Tool ${name} crashed`,
      error: err instanceof Error ? err.message : "tool_error",
    };
  }
}

export async function createPendingToolRun(input: {
  conversationId: string | null;
  userId: string;
  toolName: string;
  args: Record<string, unknown>;
}) {
  const db = getServiceRoleClient();
  if (!db) throw new Error("Service role required");
  const { data, error } = await db
    .from("alpha_tool_runs")
    .insert({
      conversation_id: input.conversationId,
      user_id: input.userId,
      tool_name: input.toolName,
      args: input.args,
      status: "pending",
    })
    .select("id, tool_name, args, status")
    .single();
  if (error || !data) throw error || new Error("tool run insert failed");
  return data as {
    id: string;
    tool_name: string;
    args: Record<string, unknown>;
    status: string;
  };
}

export async function confirmAndExecuteToolRun(
  runId: string,
  userId: string,
  ctx: ToolContext,
  decision: "confirm" | "cancel"
) {
  const db = getServiceRoleClient();
  if (!db) throw new Error("Service role required");

  const { data: run, error } = await db
    .from("alpha_tool_runs")
    .select("*")
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !run) {
    return { ok: false as const, error: "Tool run not found" };
  }
  if (run.status !== "pending") {
    return { ok: false as const, error: `Run already ${run.status}` };
  }

  if (decision === "cancel") {
    await db
      .from("alpha_tool_runs")
      .update({ status: "cancelled", executed_at: new Date().toISOString() })
      .eq("id", runId);
    return { ok: true as const, status: "cancelled" as const };
  }

  const result = await runToolImmediate(
    run.tool_name as string,
    (run.args || {}) as Record<string, unknown>,
    ctx
  );

  await db
    .from("alpha_tool_runs")
    .update({
      status: result.ok ? "executed" : "failed",
      result,
      error: result.error ?? null,
      executed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  return { ok: true as const, status: result.ok ? "executed" : "failed", result };
}
