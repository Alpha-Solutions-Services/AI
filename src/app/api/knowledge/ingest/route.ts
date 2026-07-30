import { NextRequest, NextResponse } from "next/server";
import { runFullIngest } from "@/lib/alpha/crawl";
import { requireAlphaStaff } from "@/lib/staff/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  // Allow optional secret for scripted triggers
  const secret = req.headers.get("x-cron-secret");
  const cron = process.env.CRON_SECRET?.trim();
  if (cron && secret && secret !== cron) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await runFullIngest();
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}
