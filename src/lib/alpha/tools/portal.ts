import type { AlphaTool, ToolContext, ToolResult } from "@/lib/alpha/tools/types";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

function db() {
  const client = getServiceRoleClient();
  if (!client) throw new Error("Service role client unavailable");
  return client;
}

export const portalTools: AlphaTool[] = [
  {
    name: "portal_list_tickets",
    description: "List recent Portal support tickets, optionally filtered by status.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "open | in_progress | waiting_client | resolved | closed",
        },
        limit: { type: "number" },
      },
    },
    async execute(args): Promise<ToolResult> {
      let q = db()
        .from("support_tickets")
        .select("id, subject, status, priority, client_email, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(Number(args.limit) || 15);
      if (typeof args.status === "string" && args.status) {
        q = q.eq("status", args.status);
      }
      const { data, error } = await q;
      if (error) return { ok: false, summary: "Failed to list tickets", error: error.message };
      return {
        ok: true,
        summary: `Found ${data?.length ?? 0} tickets`,
        data,
      };
    },
  },
  {
    name: "portal_search_projects",
    description: "Search Portal CRM projects by title or client email.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: [],
    },
    async execute(args): Promise<ToolResult> {
      const query = String(args.query || "").trim();
      let q = db()
        .from("portal_projects")
        .select("id, title, status, progress, client_email, category, updated_at")
        .order("updated_at", { ascending: false })
        .limit(Number(args.limit) || 15);
      if (query) {
        q = q.or(`title.ilike.%${query}%,client_email.ilike.%${query}%`);
      }
      const { data, error } = await q;
      if (error) return { ok: false, summary: "Project search failed", error: error.message };
      return { ok: true, summary: `Found ${data?.length ?? 0} projects`, data };
    },
  },
  {
    name: "portal_list_inquiries",
    description: "List recent contact inquiries from the marketing site.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
        status: { type: "string" },
      },
    },
    async execute(args): Promise<ToolResult> {
      let q = db()
        .from("contact_inquiries")
        .select("id, name, email, subject, status, created_at")
        .order("created_at", { ascending: false })
        .limit(Number(args.limit) || 15);
      if (typeof args.status === "string" && args.status) {
        q = q.eq("status", args.status);
      }
      const { data, error } = await q;
      if (error) return { ok: false, summary: "Inquiry list failed", error: error.message };
      return { ok: true, summary: `Found ${data?.length ?? 0} inquiries`, data };
    },
  },
  {
    name: "portal_update_inquiry_status",
    description: "Update a contact inquiry status (requires confirm).",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string" },
      },
      required: ["id", "status"],
    },
    async execute(args): Promise<ToolResult> {
      const { data, error } = await db()
        .from("contact_inquiries")
        .update({ status: String(args.status) })
        .eq("id", String(args.id))
        .select("id, status, email, subject")
        .maybeSingle();
      if (error) return { ok: false, summary: "Update failed", error: error.message };
      return { ok: true, summary: `Inquiry ${data?.id} → ${data?.status}`, data };
    },
  },
  {
    name: "portal_create_ticket_note",
    description: "Add an admin note/message to an existing support ticket (requires confirm).",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        ticket_id: { type: "string" },
        body: { type: "string" },
      },
      required: ["ticket_id", "body"],
    },
    async execute(args, ctx: ToolContext): Promise<ToolResult> {
      const { data, error } = await db()
        .from("support_ticket_messages")
        .insert({
          ticket_id: String(args.ticket_id),
          body: String(args.body),
          is_admin: true,
          is_ai: true,
          sender_id: ctx.userId,
        })
        .select("id, ticket_id, created_at")
        .single();
      if (error) return { ok: false, summary: "Could not add ticket note", error: error.message };
      await db()
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", String(args.ticket_id));
      return { ok: true, summary: "Ticket note added", data };
    },
  },
  {
    name: "portal_add_deal_note",
    description: "Append a note to a portal deal if portal_deals exists (requires confirm).",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        deal_id: { type: "string" },
        note: { type: "string" },
      },
      required: ["deal_id", "note"],
    },
    async execute(args): Promise<ToolResult> {
      const { data: deal, error: readErr } = await db()
        .from("portal_deals")
        .select("id, notes, title")
        .eq("id", String(args.deal_id))
        .maybeSingle();
      if (readErr) return { ok: false, summary: "Deal not found", error: readErr.message };
      if (!deal) return { ok: false, summary: "Deal not found", error: "missing" };
      const stamp = new Date().toISOString();
      const notes = `${deal.notes || ""}\n\n[${stamp}] ${String(args.note)}`.trim();
      const { data, error } = await db()
        .from("portal_deals")
        .update({ notes })
        .eq("id", deal.id)
        .select("id, title")
        .single();
      if (error) return { ok: false, summary: "Deal update failed", error: error.message };
      return { ok: true, summary: `Note added to deal ${data?.title || data?.id}`, data };
    },
  },
];
