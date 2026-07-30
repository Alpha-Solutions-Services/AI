import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmAndExecuteToolRun } from "@/lib/alpha/tools/registry";
import { requireAlphaStaff } from "@/lib/staff/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const schema = z.object({
  runId: z.string().uuid(),
  decision: z.enum(["confirm", "cancel"]),
});

export async function POST(req: NextRequest) {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const service = getServiceRoleClient();
  const { data: runMeta } = service
    ? await service
        .from("alpha_tool_runs")
        .select("conversation_id, tool_name")
        .eq("id", parsed.runId)
        .eq("user_id", session.user.id)
        .maybeSingle()
    : { data: null };

  const result = await confirmAndExecuteToolRun(
    parsed.runId,
    session.user.id,
    { userId: session.user.id, email: session.user.email ?? null },
    parsed.decision
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (
    service &&
    runMeta?.conversation_id &&
    (result.status === "executed" || result.status === "failed") &&
    "result" in result &&
    result.result
  ) {
    await service.from("alpha_messages").insert({
      conversation_id: runMeta.conversation_id,
      role: "tool",
      content: JSON.stringify(result.result),
      tool_name: runMeta.tool_name,
      metadata: { runId: parsed.runId, decision: parsed.decision },
    });
  }

  return NextResponse.json(result);
}
