import type { AlphaTool, ToolContext, ToolResult } from "@/lib/alpha/tools/types";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { createConfiguredTransporter, resolveSmtpFromAddress } from "@/lib/email/transport";

function db() {
  const client = getServiceRoleClient();
  if (!client) throw new Error("Service role client unavailable");
  return client;
}

export const opsTools: AlphaTool[] = [
  {
    name: "ops_list_notifications",
    description: "List recent portal notifications for awareness.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
    },
    async execute(args): Promise<ToolResult> {
      const tables = ["portal_notifications", "notifications"];
      let last = "not found";
      for (const table of tables) {
        const { data, error } = await db()
          .from(table)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(Number(args.limit) || 20);
        if (!error) {
          return {
            ok: true,
            summary: `${data?.length ?? 0} notifications from ${table}`,
            data,
          };
        }
        last = error.message;
      }
      return { ok: false, summary: "Notifications query failed", error: last };
    },
  },
  {
    name: "ops_draft_knowledge",
    description:
      "Create a draft portal_knowledge Q&A entry (inactive until reviewed). Requires confirm.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string" },
        answer: { type: "string" },
        category: { type: "string" },
      },
      required: ["question", "answer"],
    },
    async execute(args): Promise<ToolResult> {
      const { data, error } = await db()
        .from("portal_knowledge")
        .insert({
          question: String(args.question),
          answer: String(args.answer),
          category: args.category ? String(args.category) : "Alpha draft",
          active: false,
          tags: ["alpha-draft"],
        })
        .select("id, question, active")
        .single();
      if (error) {
        return { ok: false, summary: "Knowledge draft failed", error: error.message };
      }
      return {
        ok: true,
        summary: `Draft knowledge #${data?.id} created (inactive)`,
        data,
      };
    },
  },
  {
    name: "ops_send_email",
    description:
      "Send an email via configured SMTP (requires confirm). Use sparingly.",
    risk: "write",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["to", "subject", "body"],
    },
    async execute(args, ctx: ToolContext): Promise<ToolResult> {
      const transporter = createConfiguredTransporter();
      if (!transporter) {
        return {
          ok: false,
          summary: "SMTP not configured",
          error: "Missing SMTP_HOST/USER/PASS",
        };
      }
      const from = resolveSmtpFromAddress("Alpha <no-reply@alphasolutions.software>");
      await transporter.sendMail({
        from,
        to: String(args.to),
        subject: String(args.subject),
        text: `${String(args.body)}\n\n— Sent by Alpha on behalf of ${ctx.email || ctx.userId}`,
      });
      return {
        ok: true,
        summary: `Email sent to ${String(args.to)}`,
        data: { to: args.to, subject: args.subject },
      };
    },
  },
];
