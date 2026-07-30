import { NextRequest, NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/staff/allowlist";
import { requireAlphaStaff } from "@/lib/staff/auth";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  const id = req.nextUrl.searchParams.get("id");
  const supabase = await createClient();
  const service = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  if (id) {
    let q = supabase
      .from("alpha_conversations")
      .select("id, title, staff_email, created_at, updated_at, user_id")
      .eq("id", id);
    if (!isOwnerEmail(session.user.email)) {
      q = q.eq("user_id", session.user.id);
    }
    const { data: conv, error } = await q.maybeSingle();
    if (error || !conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { data: messages } = await supabase
      .from("alpha_messages")
      .select("id, role, content, tool_name, tool_call_id, metadata, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    const { data: pending } = await (service || supabase)
      .from("alpha_tool_runs")
      .select("id, tool_name, args, status, created_at")
      .eq("conversation_id", id)
      .eq("status", "pending")
      .eq("user_id", session.user.id);

    return NextResponse.json({ conversation: conv, messages, pending });
  }

  const { data, error } = await supabase
    .from("alpha_conversations")
    .select("id, title, updated_at, created_at")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ conversations: data });
}
