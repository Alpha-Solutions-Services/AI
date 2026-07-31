/**
 * Alpha Agent Skills — Claude-inspired progressive disclosure.
 * Metadata always available; full playbooks load when the task matches.
 * Spec inspiration: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
 */

export type AlphaSkill = {
  id: string;
  name: string;
  description: string;
  /** Planet / module affinity for Universe constellation links */
  planetIds: string[];
  /** Tool names this skill typically uses */
  tools: string[];
  /** Full playbook (loaded into prompt only when matched) */
  playbook: string;
  status: "active" | "beta";
};

export const ALPHA_SKILLS: AlphaSkill[] = [
  {
    id: "dispatch-ops",
    name: "Dispatch Ops",
    description:
      "Search loads, summarize dispatcher queue, add notes with confirm. Use for freight TMS questions.",
    planetIds: ["dispatch"],
    tools: ["tms_search_loads", "tms_dispatcher_queue_summary", "tms_add_load_note"],
    status: "active",
    playbook: `When staff ask about loads, queue, carriers on a load, or dispatch status:
1. Prefer tms_dispatcher_queue_summary for overview, tms_search_loads for specific refs.
2. Cite load_number, route (origin→destination), status, company.
3. Writes (notes) require confirm — never claim written without tool result.
4. Open TMS via browser_open_alpha_app if they want the full UI.`,
  },
  {
    id: "portal-crm",
    name: "Portal CRM",
    description:
      "Tickets, projects, inquiries, deals for client portal. Use for customer / support questions.",
    planetIds: ["portal"],
    tools: [
      "portal_list_tickets",
      "portal_search_projects",
      "portal_list_inquiries",
      "portal_create_ticket_note",
      "portal_update_inquiry_status",
      "portal_add_deal_note",
    ],
    status: "active",
    playbook: `For Portal CRM:
1. List tickets by status; search projects by title/email; list inquiries.
2. Summarize clearly: subject, status, client_email, priority.
3. Notes / status changes are write tools → confirm gate.
4. Offer browser_open_alpha_app portal when they need the full admin UI.`,
  },
  {
    id: "academy",
    name: "Learn Academy",
    description:
      "Students, certificates, live sessions, enrollments for Learn Dispatch.",
    planetIds: ["learn-academy"],
    tools: ["ld_list_enrollments", "ld_list_certificates", "ld_list_live_sessions", "org_list_students"],
    status: "active",
    playbook: `For academy/staff training:
1. Students live on profiles role=student + enrollment fields.
2. Certificates and live sessions from academy_* tables.
3. Answer in the user's language (EN/Urdu).`,
  },
  {
    id: "org-intelligence",
    name: "Org Intelligence",
    description:
      "People search across clients/carriers/drivers/students and live business snapshots.",
    planetIds: ["intelligence", "portal", "dispatch"],
    tools: ["org_search_people", "org_list_carriers", "org_list_students", "org_business_snapshot"],
    status: "active",
    playbook: `For “who is X”, “how many students”, “business status”:
1. org_business_snapshot for counts.
2. org_search_people / role filters — never invent people.
3. Connect answers to the right product URL.`,
  },
  {
    id: "engineering-map",
    name: "Engineering Map",
    description:
      "GitHub org/repos and product codebase map for Alpha Solutions Services.",
    planetIds: ["intelligence", "integrations"],
    tools: ["github_list_alpha_repos"],
    status: "active",
    playbook: `For repos, GitHub, “what projects do we have in code”:
1. github_list_alpha_repos (catalog or live API).
2. Map repos to live URLs (AI, Portal, TMS, Learn-Dispatch).
3. Do not invent private repo contents.`,
  },
  {
    id: "knowledge-web",
    name: "Knowledge & Web",
    description:
      "Company knowledge index plus careful web search/fetch for external facts.",
    planetIds: ["knowledge", "intelligence"],
    tools: ["web_search", "web_fetch"],
    status: "active",
    playbook: `1. Prefer indexed knowledge + internal tools before web_search.
2. Use web for FMCSA, ELD, public regs — cite sources.
3. If web_search fails, say so and offer knowledge / internal tools.`,
  },
  {
    id: "secure-writes",
    name: "Secure Writes",
    description:
      "Confirm-before-write discipline for any mutation tools (notes, status, email).",
    planetIds: ["settings", "intelligence"],
    tools: ["ops_send_email", "ops_draft_knowledge"],
    status: "active",
    playbook: `Never claim a write completed without a confirmed tool result.
Present pending confirms clearly. Cancel cleanly if staff declines.`,
  },
  {
    id: "bilingual-voice",
    name: "Bilingual Voice",
    description:
      "English + Urdu conversation, hearing checks, and voice-friendly short replies.",
    planetIds: ["intelligence", "settings"],
    tools: ["browser_speak"],
    status: "active",
    playbook: `Reply in the user's language. Hearing checks: acknowledge warmly without tools.
Keep spoken answers concise; avoid dumping huge tables into TTS.`,
  },
];

/** Metadata only (~Claude progressive disclosure layer 1) */
export function skillsMetadataBlock(): string {
  return ALPHA_SKILLS.map(
    (s) => `- ${s.id}: ${s.name} — ${s.description} [${s.status}]`
  ).join("\n");
}

/** Match skills by message keywords / planet context */
export function matchSkills(
  message: string,
  activePlanet?: string | null
): AlphaSkill[] {
  const t = message.toLowerCase();
  const scored = ALPHA_SKILLS.map((s) => {
    let score = 0;
    if (activePlanet && s.planetIds.includes(activePlanet)) score += 3;
    const words = s.description.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
    for (const w of words) {
      if (t.includes(w)) score += 1;
    }
    for (const id of s.planetIds) {
      if (t.includes(id.replace("-", " ")) || t.includes(id)) score += 2;
    }
    if (/load|dispatch|tms|freight|queue/.test(t) && s.id === "dispatch-ops") score += 5;
    if (/ticket|portal|inquiry|project|client/.test(t) && s.id === "portal-crm") score += 5;
    if (/student|academy|certificate|learn/.test(t) && s.id === "academy") score += 5;
    if (/github|repo|codebase/.test(t) && s.id === "engineering-map") score += 5;
    if (/snapshot|how many|carrier|driver|who is/.test(t) && s.id === "org-intelligence")
      score += 5;
    if (/web|fmcsa|eld|search online/.test(t) && s.id === "knowledge-web") score += 4;
    if (/اردو|urdu|hear|سن/.test(t) && s.id === "bilingual-voice") score += 4;
    return { s, score };
  });
  return scored
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.s);
}

export function skillsPlaybooksBlock(skills: AlphaSkill[]): string {
  if (!skills.length) return "";
  return skills
    .map((s) => `### Skill: ${s.name} (${s.id})\n${s.playbook}`)
    .join("\n\n");
}

/** Constellation edges for Universe UI */
export const SKILL_CONSTELLATION: Array<[string, string]> = [
  ["intelligence", "dispatch"],
  ["intelligence", "portal"],
  ["intelligence", "learn-academy"],
  ["intelligence", "knowledge"],
  ["dispatch", "portal"],
  ["portal", "knowledge"],
  ["learn-academy", "knowledge"],
  ["dispatch", "settings"],
  ["portal", "settings"],
];
