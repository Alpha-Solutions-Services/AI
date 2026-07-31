import { NextResponse } from "next/server";
import { requireAlphaStaff } from "@/lib/staff/auth";
import { runToolImmediate } from "@/lib/alpha/tools/registry";

export const dynamic = "force-dynamic";

/** Learn Academy planet BFF. */
export async function GET() {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  const ctx = {
    userId: session.user.id,
    email: session.user.email ?? null,
  };

  const [students, certs, sessions] = await Promise.all([
    runToolImmediate("ld_list_enrollments", { limit: 20 }, ctx),
    runToolImmediate("ld_list_certificates", { limit: 12 }, ctx),
    runToolImmediate("ld_list_live_sessions", { limit: 10 }, ctx),
  ]);

  return NextResponse.json({
    ok: students.ok || certs.ok || sessions.ok,
    metrics: {
      students: Array.isArray(students.data) ? students.data.length : 0,
      certificates: Array.isArray(certs.data) ? certs.data.length : 0,
      liveSessions: Array.isArray(sessions.data) ? sessions.data.length : 0,
    },
    students: students.ok ? students.data : [],
    certificates: certs.ok ? certs.data : [],
    sessions: sessions.ok ? sessions.data : [],
    errors: {
      students: students.error,
      certificates: certs.error,
      sessions: sessions.error,
    },
  });
}
