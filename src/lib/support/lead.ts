const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b/;

const ROLE_WORDS: { role: string; re: RegExp }[] = [
  { role: "carrier", re: /\b(carrier|owner[- ]?operator|o\/o)\b/i },
  { role: "driver", re: /\b(driver|cdl)\b/i },
  { role: "fleet", re: /\b(fleet|trucks?)\b/i },
  { role: "dispatcher", re: /\b(dispatcher|dispatch)\b/i },
  { role: "broker", re: /\b(broker)\b/i },
];

export type ExtractedLead = {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
};

export function extractLeadFromText(text: string): ExtractedLead {
  const out: ExtractedLead = {};
  const email = text.match(EMAIL_RE)?.[0];
  if (email) out.email = email.toLowerCase();

  const phone = text.match(PHONE_RE)?.[0];
  if (phone && phone.replace(/\D/g, "").length >= 10) {
    out.phone = phone.trim();
  }

  const nameMatch = text.match(
    /(?:my name is|i(?:'| a)?m|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  );
  if (nameMatch?.[1]) out.name = nameMatch[1].trim();

  for (const { role, re } of ROLE_WORDS) {
    if (re.test(text)) {
      out.role = role;
      break;
    }
  }
  return out;
}

export function mergeLead(
  current: ExtractedLead,
  next: ExtractedLead
): ExtractedLead {
  return {
    name: next.name || current.name,
    email: next.email || current.email,
    phone: next.phone || current.phone,
    role: next.role || current.role,
  };
}
