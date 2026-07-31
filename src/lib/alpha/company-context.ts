import {
  getAiUrl,
  getLearnDispatchUrl,
  getPortalUrl,
  getSiteUrl,
  getTmsUrl,
} from "@/lib/supabase/env";
import { ALPHA_GITHUB_CATALOG } from "@/lib/alpha/tools/github";

/**
 * Always-on company context injected into every Alpha turn
 * (complements retrieved knowledge chunks).
 */
export function buildCompanyContextBlock(): string {
  const repos = ALPHA_GITHUB_CATALOG.repos
    .map((r) => `- ${r.name}: ${r.product} · ${r.url_live} · ${r.url}`)
    .join("\n");

  return `
Company: Alpha Solutions LLC / Alpha Solutions Services LLC (Utah & global digital ops).

Live products:
- Marketing / public site: ${getSiteUrl()} (Sanity CMS content + Next.js)
- Client Portal: ${getPortalUrl()} — tickets, projects, contracts, inquiries, deals, DMs
- TMS (Alpha Freight Network): ${getTmsUrl()} — dispatch loads, carriers, drivers, invoices
- Learn Dispatch Academy: ${getLearnDispatchUrl()} — students, modules, certificates, live sessions
- Alpha AI console: ${getAiUrl()} — staff Jarvis + Universe OS

GitHub org: ${ALPHA_GITHUB_CATALOG.orgUrl}
${repos}

Shared database: one Supabase project powers Portal + TMS + Learn + Alpha.
Key entities (use tools — do not invent counts):
- Clients / staff / carriers / drivers / students → profiles (+ portal_projects, deals, inquiries)
- Loads → dispatch_loads (ops sheet) and tms_loads
- Academy → academy_* tables, certificates, progress
- Knowledge → alpha_documents / alpha_chunks + Sanity + portal_knowledge
- Site content (services, posts, projects, reviews) → Sanity / indexed crawl

Freight Sales (freightsales.alphasolutions.software) exists but is not fully tool-wired yet.
Prefer org_business_snapshot, org_search_people, portal_*, tms_*, ld_*, github_list_alpha_repos for facts.
`.trim();
}
