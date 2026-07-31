import type { AlphaTool, ToolResult } from "@/lib/alpha/tools/types";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const LOAD_TABLES = ["dispatch_loads", "tms_loads"] as const;

function db() {
  const client = getServiceRoleClient();
  if (!client) throw new Error("Service role client unavailable");
  return client;
}

/** Normalize TMS / dispatch row shapes for Alpha + Universe UI. */
export function normalizeLoadRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const loadNumber = row.load_number ?? row.reference ?? row.id;
  const originCity = row.origin_city ?? row.origin;
  const destCity = row.destination_city ?? row.destination;
  const originState = row.origin_state;
  const destState = row.destination_state;

  let origin =
    originCity != null
      ? [originCity, originState].filter(Boolean).join(", ")
      : "";
  let destination =
    destCity != null
      ? [destCity, destState].filter(Boolean).join(", ")
      : "";

  const details = String(row.load_details || "");
  if ((!origin || !destination) && details.includes("→")) {
    const [a, b] = details.split("→").map((s) => s.trim());
    if (!origin && a) origin = a.replace(/^Pickup:\s*/i, "");
    if (!destination && b) destination = b;
  }
  if (!origin && !destination && row.states) {
    destination = String(row.states);
  }
  if (!origin && details) {
    origin = details.replace(/^Pickup:\s*/i, "").slice(0, 80);
  }

  return {
    ...row,
    reference: String(loadNumber ?? "—"),
    origin: origin || "—",
    destination: destination || "—",
    status: String(row.status ?? "unknown"),
    company: row.company_name ?? row.broker ?? null,
  };
}

async function tryTables<T>(
  tableNames: readonly string[],
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

function closedStatusesFilter(table: string) {
  // dispatch_loads uses Paid/Unpaid/etc; tms_loads uses workflow enums
  if (table === "dispatch_loads") {
    return { column: "status", op: "not.in" as const, value: '("Cancelled","Void","Deleted")' };
  }
  return {
    column: "status",
    op: "not.in" as const,
    value: '("completed","cancelled","closed","delivered")',
  };
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
      if (!getServiceRoleClient()) {
        return {
          ok: false,
          summary: "TMS is not configured",
          error: "Service role client unavailable — set SUPABASE_SERVICE_ROLE_KEY",
        };
      }
      const limit = Number(args.limit) || 15;
      const query = String(args.query || "").trim();
      const result = await tryTables<Record<string, unknown>>(
        LOAD_TABLES,
        async (table) => {
          let q = db().from(table).select("*").limit(limit);
          if (table === "dispatch_loads") {
            q = q.is("deleted_at", null);
            if (query) {
              q = q.or(
                `load_number.ilike.%${query}%,load_details.ilike.%${query}%,states.ilike.%${query}%,status.ilike.%${query}%,company_name.ilike.%${query}%`
              );
            }
          } else if (query) {
            q = q.or(
              `load_number.ilike.%${query}%,origin_city.ilike.%${query}%,destination_city.ilike.%${query}%,status.ilike.%${query}%`
            );
          }
          return q.order("created_at", { ascending: false });
        }
      );
      if ("error" in result) {
        return { ok: false, summary: "TMS load search failed", error: result.error };
      }
      const data = result.data.map(normalizeLoadRow);
      return {
        ok: true,
        summary: `Found ${data.length} loads in ${result.table}`,
        data,
      };
    },
  },
  {
    name: "tms_dispatcher_queue_summary",
    description: "Summarize open/active TMS loads for dispatchers.",
    risk: "read",
    parameters: { type: "object", properties: {} },
    async execute(): Promise<ToolResult> {
      if (!getServiceRoleClient()) {
        return {
          ok: false,
          summary: "TMS is not configured",
          error: "Service role client unavailable — set SUPABASE_SERVICE_ROLE_KEY",
        };
      }
      const result = await tryTables<Record<string, unknown>>(
        LOAD_TABLES,
        async (table) => {
          const filter = closedStatusesFilter(table);
          let q = db()
            .from(table)
            .select("*")
            .not(filter.column, "in", filter.value)
            .limit(100);
          if (table === "dispatch_loads") {
            q = q.is("deleted_at", null);
          }
          return q.order("created_at", { ascending: false });
        }
      );
      if ("error" in result) {
        return { ok: false, summary: "Queue summary failed", error: result.error };
      }
      const rows = result.data.map(normalizeLoadRow);
      const byStatus: Record<string, number> = {};
      for (const row of rows) {
        const status = String(row.status ?? "unknown");
        byStatus[status] = (byStatus[status] || 0) + 1;
      }
      return {
        ok: true,
        summary: `${rows.length} active loads across statuses`,
        data: {
          table: result.table,
          byStatus,
          sample: rows.slice(0, 20),
        },
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
          description: "Optional table override: dispatch_loads | tms_loads",
        },
      },
      required: ["load_id", "note"],
    },
    async execute(args): Promise<ToolResult> {
      const tables = args.table
        ? [String(args.table)]
        : [...LOAD_TABLES];
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
