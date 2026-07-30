const FALLBACK_STAFF_EMAILS = [
  "alphaassistant.alpha@gmail.com",
  "muhammadmikran.alpha@gmail.com",
] as const;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function parseList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => normalize(s))
    .filter(Boolean);
}

/** Staff who may use Alpha (ALPHA_STAFF_EMAILS → ADMIN_EMAILS → fallbacks). */
export function getStaffAllowlist(): string[] {
  const primary = parseList(process.env.ALPHA_STAFF_EMAILS);
  const admin = parseList(process.env.ADMIN_EMAILS);
  const merged = [...primary, ...admin, ...FALLBACK_STAFF_EMAILS.map(normalize)];
  return Array.from(new Set(merged));
}

export function isStaffEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return new Set(getStaffAllowlist()).has(normalize(email));
}

export function getOwnerAllowlist(): string[] {
  const owners = parseList(process.env.ALPHA_OWNER_EMAILS);
  const legacy = parseList(process.env.OWNER_EMAILS);
  if (owners.length || legacy.length) {
    return Array.from(new Set([...owners, ...legacy]));
  }
  return getStaffAllowlist().slice(0, 1);
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return new Set(getOwnerAllowlist()).has(normalize(email));
}
