import type { AlphaTool, ToolResult } from "@/lib/alpha/tools/types";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

function db() {
  const client = getServiceRoleClient();
  if (!client) throw new Error("Service role client unavailable");
  return client;
}

/**
 * Cross-product people & org tools — clients, carriers, drivers, students, staff.
 */
export const orgTools: AlphaTool[] = [
  {
    name: "org_search_people",
    description:
      "Search people across Alpha: clients, carriers, drivers, students, dispatchers, staff by name/email/role.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        role: {
          type: "string",
          description:
            "Optional filter: student | carrier | driver | dispatcher | client | admin | staff",
        },
        limit: { type: "number" },
      },
    },
    async execute(args): Promise<ToolResult> {
      const limit = Number(args.limit) || 25;
      const query = String(args.query || "").trim();
      const role = String(args.role || "").trim().toLowerCase();

      let q = db()
        .from("profiles")
        .select("id, full_name, email, role, company_name, phone, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (role && role !== "client") {
        q = q.eq("role", role);
      }
      if (query) {
        q = q.or(
          `full_name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`
        );
      }

      const { data, error } = await q;
      if (error) {
        // company_name may not exist on all schema versions
        let q2 = db()
          .from("profiles")
          .select("id, full_name, email, role, phone, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (role && role !== "client") q2 = q2.eq("role", role);
        if (query) {
          q2 = q2.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
        }
        const retry = await q2;
        if (retry.error) {
          return {
            ok: false,
            summary: "People search failed",
            error: retry.error.message,
          };
        }
        return {
          ok: true,
          summary: `${retry.data?.length ?? 0} people`,
          data: retry.data,
        };
      }
      return { ok: true, summary: `${data?.length ?? 0} people`, data };
    },
  },
  {
    name: "org_list_students",
    description: "List Learn Dispatch students (profiles role=student) with progress counts.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { limit: { type: "number" }, query: { type: "string" } },
    },
    async execute(args): Promise<ToolResult> {
      const limit = Number(args.limit) || 30;
      const query = String(args.query || "").trim();
      let q = db()
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .eq("role", "student")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (query) {
        q = q.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
      }
      const { data: students, error } = await q;
      if (error) {
        return { ok: false, summary: "Students query failed", error: error.message };
      }

      const { data: progress } = await db()
        .from("academy_progress")
        .select("user_id, module_id, completed")
        .limit(500);

      const byUser: Record<string, { modules: number; completed: number }> = {};
      for (const row of progress || []) {
        const uid = String(row.user_id);
        if (!byUser[uid]) byUser[uid] = { modules: 0, completed: 0 };
        byUser[uid].modules += 1;
        if (row.completed) byUser[uid].completed += 1;
      }

      const enriched = (students || []).map((s) => ({
        ...s,
        progress: byUser[s.id] || { modules: 0, completed: 0 },
      }));

      return {
        ok: true,
        summary: `${enriched.length} students`,
        data: enriched,
      };
    },
  },
  {
    name: "org_list_carriers",
    description: "List carriers from profiles + TMS carrier tables + dispatch roster.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { limit: { type: "number" }, query: { type: "string" } },
    },
    async execute(args): Promise<ToolResult> {
      const limit = Number(args.limit) || 30;
      const query = String(args.query || "").trim();

      let pq = db()
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .eq("role", "carrier")
        .limit(limit);
      if (query) pq = pq.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
      const profiles = await pq;

      const tms = await db().from("tms_carriers").select("*").limit(limit);
      const roster = await db()
        .from("dispatch_carrier_roster")
        .select("*")
        .limit(limit);
      const portal = await db()
        .from("dispatch_carrier_portal")
        .select("*")
        .limit(limit);

      return {
        ok: true,
        summary: `Carriers: ${profiles.data?.length ?? 0} profiles, ${tms.data?.length ?? 0} tms, ${roster.data?.length ?? 0} roster`,
        data: {
          profiles: profiles.data || [],
          tms_carriers: tms.data || [],
          dispatch_roster: roster.data || [],
          carrier_portal: portal.data || [],
          errors: {
            profiles: profiles.error?.message,
            tms: tms.error?.message,
            roster: roster.error?.message,
            portal: portal.error?.message,
          },
        },
      };
    },
  },
  {
    name: "org_business_snapshot",
    description:
      "Live counts across Portal, TMS, Learn Academy, and Alpha knowledge — use for status briefings.",
    risk: "read",
    parameters: { type: "object", properties: {} },
    async execute(): Promise<ToolResult> {
      const client = db();
      const [
        loads,
        tickets,
        projects,
        inquiries,
        contracts,
        students,
        carriers,
        drivers,
        dispatchers,
        certs,
        docs,
        chunks,
      ] = await Promise.all([
        client
          .from("dispatch_loads")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        client
          .from("support_tickets")
          .select("id", { count: "exact", head: true })
          .neq("status", "closed"),
        client.from("portal_projects").select("id", { count: "exact", head: true }),
        client.from("contact_inquiries").select("id", { count: "exact", head: true }),
        client.from("portal_contracts").select("id", { count: "exact", head: true }),
        client
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "student"),
        client
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "carrier"),
        client
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "driver"),
        client
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "dispatcher"),
        client.from("academy_certificates").select("id", { count: "exact", head: true }),
        client.from("alpha_documents").select("id", { count: "exact", head: true }),
        client.from("alpha_chunks").select("id", { count: "exact", head: true }),
      ]);

      const snapshot = {
        dispatch_loads: loads.count ?? 0,
        open_tickets: tickets.count ?? 0,
        portal_projects: projects.count ?? 0,
        contact_inquiries: inquiries.count ?? 0,
        contracts: contracts.count ?? 0,
        students: students.count ?? 0,
        carriers: carriers.count ?? 0,
        drivers: drivers.count ?? 0,
        dispatchers: dispatchers.count ?? 0,
        certificates: certs.count ?? 0,
        knowledge_docs: docs.count ?? 0,
        knowledge_chunks: chunks.count ?? 0,
      };

      return {
        ok: true,
        summary: `Loads ${snapshot.dispatch_loads} · tickets ${snapshot.open_tickets} · students ${snapshot.students} · projects ${snapshot.portal_projects}`,
        data: snapshot,
      };
    },
  },
];
