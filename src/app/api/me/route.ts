import { NextResponse } from "next/server";
import { requireAlphaStaff } from "@/lib/staff/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;
  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    isOwner: session.isOwner,
  });
}
