import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export type SupportSiteRow = {
  slug: string;
  display_name: string;
  allowed_origins: string[];
  onboard_mode: "tms_carrier" | "portal_client" | "none";
  whatsapp_url: string | null;
  knowledge_tags: string[];
  product: string;
  is_public: boolean;
  active: boolean;
};

const FALLBACK_AFN: SupportSiteRow = {
  slug: "afn",
  display_name: "Alpha Freight Network",
  allowed_origins: [
    "https://afn.alphasolutions.software",
    "http://localhost:3010",
    "http://127.0.0.1:3010",
  ],
  onboard_mode: "tms_carrier",
  whatsapp_url: "https://wa.me/923494206922",
  knowledge_tags: ["afn", "public", "marketing"],
  product: "marketing",
  is_public: true,
  active: true,
};

export function isSupportAgentEnabled() {
  const v = process.env.SUPPORT_AGENT_ENABLED?.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "off") return false;
  return true;
}

export function getSiteKeyForSlug(slug: string): string | null {
  const envKey = `SUPPORT_SITE_KEYS_${slug.toUpperCase().replace(/-/g, "_")}`;
  const key = process.env[envKey]?.trim();
  return key || null;
}

export async function loadSupportSite(
  slug: string
): Promise<SupportSiteRow | null> {
  const db = getServiceRoleClient();
  if (!db) {
    if (slug === "afn") return FALLBACK_AFN;
    return null;
  }
  const { data, error } = await db
    .from("support_sites")
    .select(
      "slug, display_name, allowed_origins, onboard_mode, whatsapp_url, knowledge_tags, product, is_public, active"
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) {
    if (slug === "afn") return FALLBACK_AFN;
    return null;
  }
  return {
    slug: data.slug as string,
    display_name: data.display_name as string,
    allowed_origins: (data.allowed_origins as string[]) || [],
    onboard_mode: data.onboard_mode as SupportSiteRow["onboard_mode"],
    whatsapp_url: (data.whatsapp_url as string) || null,
    knowledge_tags: (data.knowledge_tags as string[]) || [],
    product: (data.product as string) || "marketing",
    is_public: Boolean(data.is_public),
    active: Boolean(data.active),
  };
}

export function hashIp(ip: string | null): string {
  const salt = process.env.SUPPORT_IP_HASH_SALT?.trim() || "alpha-support";
  const raw = `${salt}:${ip || "unknown"}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function getRequestOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const referer = req.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function getClientIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

export function corsHeaders(origin: string | null, allowed: string[]) {
  const headers = new Headers();
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, x-support-site-key, x-support-visitor-token"
  );
  headers.set("Access-Control-Max-Age", "86400");
  if (origin && allowed.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

export function jsonError(
  status: number,
  message: string,
  cors?: Headers
): NextResponse {
  const res = NextResponse.json({ error: message }, { status });
  if (cors) {
    cors.forEach((v, k) => res.headers.set(k, v));
  }
  return res;
}

export function jsonOk(body: unknown, cors?: Headers, status = 200): NextResponse {
  const res = NextResponse.json(body, { status });
  if (cors) {
    cors.forEach((v, k) => res.headers.set(k, v));
  }
  return res;
}

export type GuardOk = {
  site: SupportSiteRow;
  origin: string;
  cors: Headers;
  ipHash: string;
  siteKey: string;
};

/**
 * Hard security gate for public /api/support/* routes.
 * Origin allowlist + required site key. Never allow *.
 */
export async function guardPublicSupportRequest(
  req: Request,
  siteSlug: string
): Promise<GuardOk | NextResponse> {
  if (!isSupportAgentEnabled()) {
    return jsonError(503, "Support agent unavailable");
  }

  const site = await loadSupportSite(siteSlug);
  if (!site || !site.is_public) {
    return jsonError(403, "Site not allowed");
  }

  const origin = getRequestOrigin(req);
  const cors = corsHeaders(origin, site.allowed_origins);

  if (req.method === "OPTIONS") {
    if (!origin || !site.allowed_origins.includes(origin)) {
      return jsonError(403, "Origin not allowed", cors);
    }
    return new NextResponse(null, { status: 204, headers: cors });
  }

  if (!origin || !site.allowed_origins.includes(origin)) {
    return jsonError(403, "Origin not allowed", cors);
  }

  const expectedKey = getSiteKeyForSlug(site.slug);
  const provided = req.headers.get("x-support-site-key")?.trim() || "";
  if (!expectedKey || provided !== expectedKey) {
    return jsonError(403, "Invalid site key", cors);
  }

  return {
    site,
    origin,
    cors,
    ipHash: hashIp(getClientIp(req)),
    siteKey: provided,
  };
}
