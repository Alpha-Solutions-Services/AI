import type { AlphaTool, ToolResult } from "@/lib/alpha/tools/types";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

function db() {
  const client = getServiceRoleClient();
  if (!client) throw new Error("Service role client unavailable");
  return client;
}

export const learnDispatchTools: AlphaTool[] = [
  {
    name: "ld_list_live_sessions",
    description: "List Learn Dispatch live sessions.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
    },
    async execute(args): Promise<ToolResult> {
      const { data, error } = await db()
        .from("academy_live_sessions")
        .select("*")
        .order("starts_at", { ascending: false })
        .limit(Number(args.limit) || 20);
      if (error) {
        return { ok: false, summary: "Live sessions query failed", error: error.message };
      }
      return { ok: true, summary: `${data?.length ?? 0} live sessions`, data };
    },
  },
  {
    name: "ld_list_certificates",
    description: "List recent academy certificates.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
        query: { type: "string" },
      },
    },
    async execute(args): Promise<ToolResult> {
      let q = db()
        .from("academy_certificates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(Number(args.limit) || 20);
      const query = String(args.query || "").trim();
      if (query) {
        q = q.or(
          `student_name.ilike.%${query}%,student_email.ilike.%${query}%,code.ilike.%${query}%`
        );
      }
      const { data, error } = await q;
      if (error) {
        return { ok: false, summary: "Certificates query failed", error: error.message };
      }
      return { ok: true, summary: `${data?.length ?? 0} certificates`, data };
    },
  },
  {
    name: "ld_list_enrollments",
    description: "List academy enrollments if the enrollments table exists.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
        status: { type: "string" },
      },
    },
    async execute(args): Promise<ToolResult> {
      const tables = ["academy_enrollments", "enrollments"];
      let last = "not found";
      for (const table of tables) {
        let q = db().from(table).select("*").limit(Number(args.limit) || 20);
        if (typeof args.status === "string" && args.status) {
          q = q.eq("status", args.status);
        }
        const { data, error } = await q.order("created_at", { ascending: false });
        if (!error) {
          return {
            ok: true,
            summary: `${data?.length ?? 0} enrollments from ${table}`,
            data,
          };
        }
        last = error.message;
      }
      return { ok: false, summary: "Enrollments query failed", error: last };
    },
  },
];
