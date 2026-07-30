import { NextResponse } from "next/server";
import { requireAlphaStaff } from "@/lib/staff/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  const db = getServiceRoleClient();
  if (!db) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  const [{ count: docs }, { count: chunks }, { data: lastRun }] = await Promise.all([
    db.from("alpha_documents").select("*", { count: "exact", head: true }),
    db.from("alpha_chunks").select("*", { count: "exact", head: true }),
    db
      .from("alpha_ingest_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  const { data: bySource } = await db
    .from("alpha_documents")
    .select("source")
    .limit(2000);

  const sourceCounts: Record<string, number> = {};
  for (const row of bySource ?? []) {
    const s = String(row.source);
    sourceCounts[s] = (sourceCounts[s] || 0) + 1;
  }

  return NextResponse.json({
    documents: docs ?? 0,
    chunks: chunks ?? 0,
    sourceCounts,
    recentRuns: lastRun ?? [],
  });
}
