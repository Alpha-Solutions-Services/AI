import { NextResponse } from "next/server";
import { requireAlphaStaff } from "@/lib/staff/auth";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { runToolImmediate } from "@/lib/alpha/tools/registry";

export const dynamic = "force-dynamic";

/** Portal planet BFF — tickets + projects + inquiries. */
export async function GET() {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  const ctx = {
    userId: session.user.id,
    email: session.user.email ?? null,
  };

  const [tickets, projects, inquiries] = await Promise.all([
    runToolImmediate("portal_list_tickets", { limit: 12 }, ctx),
    runToolImmediate("portal_search_projects", { query: "", limit: 12 }, ctx),
    runToolImmediate("portal_list_inquiries", { limit: 12 }, ctx),
  ]);

  const db = getServiceRoleClient();
  let contracts = 0;
  if (db) {
    const { count } = await db
      .from("portal_contracts")
      .select("id", { count: "exact", head: true });
    contracts = count ?? 0;
  }

  return NextResponse.json({
    ok: tickets.ok || projects.ok || inquiries.ok,
    metrics: {
      openTickets: Array.isArray(tickets.data) ? tickets.data.length : 0,
      projects: Array.isArray(projects.data) ? projects.data.length : 0,
      inquiries: Array.isArray(inquiries.data) ? inquiries.data.length : 0,
      contracts,
    },
    tickets: tickets.ok ? tickets.data : [],
    projects: projects.ok ? projects.data : [],
    inquiries: inquiries.ok ? inquiries.data : [],
    errors: {
      tickets: tickets.error,
      projects: projects.error,
      inquiries: inquiries.error,
    },
  });
}
