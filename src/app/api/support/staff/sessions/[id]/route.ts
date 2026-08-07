import { z } from "zod";
import { requireAlphaStaff } from "@/lib/staff/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  const db = getServiceRoleClient();
  if (!db) {
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { data: row, error } = await db
    .from("support_sessions")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { data: messages } = await db
    .from("support_messages")
    .select("id, role, content, created_at, meta")
    .eq("session_id", params.id)
    .order("created_at", { ascending: true })
    .limit(200);

  const { data: lead } = await db
    .from("support_leads")
    .select("*")
    .eq("session_id", params.id)
    .maybeSingle();

  return Response.json({ session: row, messages: messages || [], lead });
}

const actionSchema = z.object({
  action: z.enum(["join", "release", "close", "message"]),
  content: z.string().max(4000).optional(),
});

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAlphaStaff();
  if ("error" in auth) return auth.error;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getServiceRoleClient();
  if (!db) {
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { data: row } = await db
    .from("support_sessions")
    .select("id, site_slug, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const email = auth.user.email || null;
  const { action, content } = parsed.data;

  if (action === "join") {
    await db
      .from("support_sessions")
      .update({
        status: "human",
        assigned_staff_id: auth.user.id,
        assigned_staff_email: email,
        updated_at: now,
        last_message_at: now,
      })
      .eq("id", params.id);

    await db.from("support_messages").insert({
      session_id: params.id,
      site_slug: row.site_slug,
      role: "system",
      content: "An Alpha team member joined the chat.",
      meta: { event: "join", staff_email: email },
    });

    await db.from("support_staff_events").insert({
      session_id: params.id,
      site_slug: row.site_slug,
      staff_id: auth.user.id,
      staff_email: email,
      event: "join",
    });

    return Response.json({ ok: true, status: "human" });
  }

  if (action === "release") {
    await db
      .from("support_sessions")
      .update({
        status: "bot",
        assigned_staff_id: null,
        assigned_staff_email: null,
        updated_at: now,
      })
      .eq("id", params.id);

    await db.from("support_messages").insert({
      session_id: params.id,
      site_slug: row.site_slug,
      role: "system",
      content: "Returned to the support assistant.",
      meta: { event: "release" },
    });

    await db.from("support_staff_events").insert({
      session_id: params.id,
      site_slug: row.site_slug,
      staff_id: auth.user.id,
      staff_email: email,
      event: "release",
    });

    return Response.json({ ok: true, status: "bot" });
  }

  if (action === "close") {
    await db
      .from("support_sessions")
      .update({
        status: "closed",
        updated_at: now,
        last_message_at: now,
      })
      .eq("id", params.id);

    await db.from("support_messages").insert({
      session_id: params.id,
      site_slug: row.site_slug,
      role: "system",
      content: "This conversation was closed.",
      meta: { event: "close" },
    });

    await db.from("support_staff_events").insert({
      session_id: params.id,
      site_slug: row.site_slug,
      staff_id: auth.user.id,
      staff_email: email,
      event: "close",
    });

    return Response.json({ ok: true, status: "closed" });
  }

  // message
  const text = content?.trim();
  if (!text) {
    return Response.json({ error: "Message required" }, { status: 400 });
  }

  if (row.status !== "human") {
    await db
      .from("support_sessions")
      .update({
        status: "human",
        assigned_staff_id: auth.user.id,
        assigned_staff_email: email,
        updated_at: now,
      })
      .eq("id", params.id);
  }

  await db.from("support_messages").insert({
    session_id: params.id,
    site_slug: row.site_slug,
    role: "staff",
    content: text,
    meta: { staff_email: email },
  });

  await db
    .from("support_sessions")
    .update({ last_message_at: now, updated_at: now })
    .eq("id", params.id);

  await db.from("support_staff_events").insert({
    session_id: params.id,
    site_slug: row.site_slug,
    staff_id: auth.user.id,
    staff_email: email,
    event: "message",
  });

  return Response.json({ ok: true });
}
