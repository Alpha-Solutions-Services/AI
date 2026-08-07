import type { SupportSiteRow } from "@/lib/support/security";

/** Structured AFN public knowledge — tagged for training / RAG by site_slug. */
export const AFN_PUBLIC_KNOWLEDGE = {
  site_slug: "afn",
  product: "marketing",
  visibility: "public" as const,
  brand: "Alpha Freight Network (AFN)",
  company: "Alpha Solutions Services LLC",
  contact: {
    email: "info@alphasolutions.software",
    phone: "+92 349 420 6922",
    whatsapp: "https://wa.me/923494206922",
    address: "7533 S Center View Ct Ste R, West Jordan, UT 84084, US",
  },
  tms_url: "https://tms.alphasolutions.software",
  site_url: "https://afn.alphasolutions.software",
  services: [
    {
      slug: "dispatching",
      title: "Dispatching",
      detail: "8% / 6%",
      body: "Load coverage, rate negotiation, and carrier coordination so your trucks stay moving and margins stay defendable.",
    },
    {
      slug: "driver-hunting",
      title: "Driver hunting",
      detail: "Recruiting support",
      body: "Sourcing and screening conversations aligned to your safety and compliance standards.",
    },
    {
      slug: "mc-lease-on",
      title: "MC lease-on",
      detail: "Authority programs",
      body: "Structured lease-on workflows that keep filings, insurance expectations, and revenue splits explicit from day one.",
    },
    {
      slug: "carrier-sales",
      title: "Carrier sales",
      detail: "Growth",
      body: "Outbound positioning for your lanes and capacity so you are in more broker and shipper conversations.",
    },
    {
      slug: "dat-management",
      title: "DAT management",
      detail: "Load board ops",
      body: "Search discipline, posting hygiene, and follow-up cadence so DAT spend converts to booked freight.",
    },
    {
      slug: "fmcsa-compliance",
      title: "FMCSA compliance",
      detail: "Safety & filings",
      body: "Monitoring reminders, document hygiene, and escalation paths that reduce audit surprises and downtime risk.",
    },
  ],
  faqs: [
    {
      q: "Do you dispatch for owner-operators only or also for fleets?",
      a: "Both. We work with solo owner-operators and fleets up to 20+ trucks.",
    },
    {
      q: "What is your dispatch fee?",
      a: "8% of gross per load for standard service, 6% for long-term contracts.",
    },
    {
      q: "What lanes and freight types do you cover?",
      a: "Dry van, reefer, flatbed, and step deck. We cover all 48 continental US states.",
    },
    {
      q: "Do you handle FMCSA compliance paperwork?",
      a: "Yes. We offer full FMCSA compliance support as a separate service including DOT filings, drug consortium enrollment, and safety audits.",
    },
    {
      q: "How do I get started?",
      a: "Chat with us here, WhatsApp, or the contact form. We onboard new carriers within 24-48 hours. You can also create a TMS account to manage loads.",
    },
  ],
  dispatch_steps: [
    "You find loads — we align on lanes, minimums, and preferred brokers/shippers.",
    "We negotiate — rates, accessorials, and appointments before you commit equipment.",
    "Carrier delivers — dispatch support through pickup, transit, and delivery.",
    "You get paid — invoice hygiene and follow-up so cash hits faster.",
  ],
} as const;

export function buildPublicKnowledgeBlock(site: SupportSiteRow): string {
  if (site.slug !== "afn") {
    return `Site: ${site.display_name}. Answer only from published marketing facts for this brand. Do not invent pricing or private account data.`;
  }
  const k = AFN_PUBLIC_KNOWLEDGE;
  const services = k.services
    .map((s) => `- ${s.title} (${s.detail}): ${s.body}`)
    .join("\n");
  const faqs = k.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
  return [
    `site_slug=${k.site_slug} product=${k.product} visibility=${k.visibility}`,
    `Brand: ${k.brand} (${k.company})`,
    `Contact: ${k.contact.email} | ${k.contact.phone} | WhatsApp ${k.contact.whatsapp}`,
    `Address: ${k.contact.address}`,
    `TMS onboard: ${k.tms_url}`,
    `Website: ${k.site_url}`,
    "",
    "Services:",
    services,
    "",
    "FAQs:",
    faqs,
    "",
    "Dispatch flow:",
    k.dispatch_steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
  ].join("\n");
}
