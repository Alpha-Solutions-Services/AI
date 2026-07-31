import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runToolImmediate } from "@/lib/alpha/tools/registry";
import { requireAlphaStaff } from "@/lib/staff/auth";

export const dynamic = "force-dynamic";

/**
 * Dispatch BFF — reuses the SAME Supabase queries as Alpha chat tools
 * (tms_search_loads, tms_dispatcher_queue_summary). No iframe / no TMS UI import.
 */
export async function GET(req: NextRequest) {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  const view = req.nextUrl.searchParams.get("view") || "queue";
  const query = req.nextUrl.searchParams.get("q") || "";
  const ctx = {
    userId: session.user.id,
    email: session.user.email ?? null,
  };

  if (view === "loads" || query) {
    const result = await runToolImmediate(
      "tms_search_loads",
      { query, limit: 25 },
      ctx
    );
    return NextResponse.json({
      view: "loads",
      ok: result.ok,
      summary: result.summary,
      error: result.error,
      loads: result.ok ? result.data : [],
    });
  }

  const result = await runToolImmediate(
    "tms_dispatcher_queue_summary",
    {},
    ctx
  );
  return NextResponse.json({
    view: "queue",
    ok: result.ok,
    summary: result.summary,
    error: result.error,
    data: result.ok ? result.data : null,
  });
}

const noteSchema = z.object({
  loadId: z.string().min(1),
  note: z.string().min(1).max(2000),
});

/**
 * Write path still goes through confirm-before-write in Stage 4 UI.
 * This endpoint is available for confirmed tool runs; prefer /api/tools/confirm.
 */
export async function POST(req: NextRequest) {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  let body: z.infer<typeof noteSchema>;
  try {
    body = noteSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  return NextResponse.json({
    requiresConfirmation: true,
    toolName: "tms_add_load_note",
    args: { load_id: body.loadId, note: body.note },
    description: `Add note to load ${body.loadId}: “${body.note.slice(0, 80)}”`,
  });
}
