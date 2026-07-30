import type { AlphaTool, ToolResult } from "@/lib/alpha/tools/types";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

function db() {
  const client = getServiceRoleClient();
  if (!client) throw new Error("Service role client unavailable");
  return client;
}

async function tryTables<T>(
  tableNames: string[],
  run: (table: string) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ table: string; data: T[] } | { error: string }> {
  let last = "No matching TMS table";
  for (const table of tableNames) {
    const { data, error } = await run(table);
    if (!error) return { table, data: data ?? [] };
    last = error.message;
  }
  return { error: last };
}

export const tmsTools: AlphaTool[] = [
  {
    name: "tms_search_loads",
    description:
      "Search freight/TMS loads by reference, origin, destination, or status.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
    },
    async execute(args): Promise<ToolResult> {
      const limit = Number(args.limit) || 15;
      const query = String(args.query || "").trim();
      const result = await tryTables<Record<string, unknown>>(
        ["freight_loads", "loads", "tms_loads"],
        async (table) => {
          let q = db().from(table).select("*").limit(limit);
          if (query) {
            q = q.or(
              `reference.ilike.%${query}%,origin.ilike.%${query}%,destination.ilike.%${query}%,status.ilike.%${query}%`
            );
          }
          return q.order("created_at", { ascending: false });
        }
      );
      if ("error" in result) {
        return { ok: false, summary: "TMS load search failed", error: result.error };
      }
      return {
        ok: true,
        summary: `Found ${result.data.length} loads in ${result.table}`,
        data: result.data,
      };
    },
  },
  {
    name: "tms_dispatcher_queue_summary",
    description: "Summarize open/active TMS loads for dispatchers.",
    risk: "read",
    parameters: { type: "object", properties: {} },
    async execute(): Promise<ToolResult> {
      const result = await tryTables<Record<string, unknown>>(
        ["freight_loads", "loads", "tms_loads"],
        async (table) =>
          db()
            .from(table)
            .select("id, status, created_at")
            .not("status", "in", '("completed","cancelled","closed","delivered")')
            .limit(100)
      );
      if ("error" in result) {
        return { ok: false, summary: "Queue summary failed", error: result.error };
      }
      const byStatus: Record<string, number> = {};
      for (const row of result.data) {
        const status = String(row.status ?? "unknown");
        byStatus[status] = (byStatus[status] || 0) + 1;
      }
      return {
        ok: true,
        summary: `${result.data.length} active loads across statuses`,
        data: { table: result.table, byStatus, sample: result.data.slice(0, 20) },
      };
    },
  },
  {
    name: "tms_add_load_note",
    description: "Append a note to a TMS load record (requires confirm).",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        load_id: { type: "string" },
        note: { type: "string" },
        table: {
          type: "string",
          description: "Optional table override: freight_loads | loads | tms_loads",
        },
      },
      required: ["load_id", "note"],
    },
    async execute(args): Promise<ToolResult> {
      const tables = args.table
        ? [String(args.table)]
        : ["freight_loads", "loads", "tms_loads"];
      let lastErr = "not found";
      for (const table of tables) {
        const { data: row, error: readErr } = await db()
          .from(table)
          .select("id, notes")
          .eq("id", String(args.load_id))
          .maybeSingle();
        if (readErr || !row) {
          lastErr = readErr?.message || "missing";
          continue;
        }
        const stamp = new Date().toISOString();
        const notes = `${(row as { notes?: string }).notes || ""}\n\n[${stamp}] ${String(args.note)}`.trim();
        const { data, error } = await db()
          .from(table)
          .update({ notes })
          .eq("id", row.id)
          .select("id")
          .single();
        if (error) {
          lastErr = error.message;
          continue;
        }
        return { ok: true, summary: `Note added on ${table}:${data?.id}`, data };
      }
      return { ok: false, summary: "Could not add load note", error: lastErr };
    },
  },
];
