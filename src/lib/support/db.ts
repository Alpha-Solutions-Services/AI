import { getServiceRoleClient } from "@/lib/supabase/service-role";
import type { ExtractedLead } from "@/lib/support/lead";
import { mergeLead } from "@/lib/support/lead";

export type SupportSessionRow = {
  id: string;
  site_slug: string;
  visitor_token: string;
  status: "bot" | "queued" | "human" | "closed";
  page_url: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_role: string | null;
  lead_intent: string | null;
  assigned_staff_id: string | null;
  assigned_staff_email: string | null;
  last_message_at: string;
  created_at: string;
};

export async function persistLeadFields(
  sessionId: string,
  siteSlug: string,
  product: string,
  incoming: ExtractedLead,
  intent?: string | null
) {
  const db = getServiceRoleClient();
  if (!db) return null;

  const { data: session } = await db
    .from("support_sessions")
    .select("lead_name, lead_email, lead_phone, lead_role, lead_intent")
    .eq("id", sessionId)
    .maybeSingle();

  const merged = mergeLead(
    {
      name: session?.lead_name as string | undefined,
      email: session?.lead_email as string | undefined,
      phone: session?.lead_phone as string | undefined,
      role: session?.lead_role as string | undefined,
    },
    incoming
  );

  const patch = {
    lead_name: merged.name ?? null,
    lead_email: merged.email ?? null,
    lead_phone: merged.phone ?? null,
    lead_role: merged.role ?? null,
    lead_intent: intent ?? (session?.lead_intent as string | null) ?? null,
    updated_at: new Date().toISOString(),
  };

  await db.from("support_sessions").update(patch).eq("id", sessionId);

  const hasAny = merged.name || merged.email || merged.phone || merged.role;
  if (!hasAny) return merged;

  await db.from("support_leads").upsert(
    {
      session_id: sessionId,
      site_slug: siteSlug,
      product,
      name: merged.name ?? null,
      email: merged.email ?? null,
      phone: merged.phone ?? null,
      role: merged.role ?? null,
      intent: intent ?? null,
      onboard_status: "captured",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" }
  );

  return merged;
}
