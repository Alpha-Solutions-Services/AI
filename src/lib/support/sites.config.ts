/**
 * Structured site profiles for Support Agent (training-ready labels).
 * DB `support_sites` is source of truth for origins; this mirrors onboard/copy.
 */
export type SupportSiteProfile = {
  slug: string;
  product: "marketing" | "portal" | "tms" | "learn";
  visibility: "public";
  displayName: string;
  onboardMode: "tms_carrier" | "portal_client" | "none";
  defaultOrigins: string[];
  knowledgeTags: string[];
};

export const SUPPORT_SITE_PROFILES: Record<string, SupportSiteProfile> = {
  afn: {
    slug: "afn",
    product: "marketing",
    visibility: "public",
    displayName: "Alpha Freight Network",
    onboardMode: "tms_carrier",
    defaultOrigins: [
      "https://afn.alphasolutions.software",
      "http://localhost:3010",
      "http://127.0.0.1:3010",
    ],
    knowledgeTags: ["afn", "public", "marketing"],
  },
};
