import nodemailer from "nodemailer";

function stripWrappingQuotes(value: string) {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1).trim();
  }
  return v;
}

export function resolveSmtpFromAddress(fallbackFrom: string) {
  const fromRaw = process.env.SMTP_FROM;
  const fromStripped =
    typeof fromRaw === "string" ? stripWrappingQuotes(fromRaw) : undefined;
  return (
    fromStripped ||
    fallbackFrom ||
    process.env.SMTP_USER?.trim() ||
    "no-reply@alphasolutions.software"
  );
}

export function createConfiguredTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const passRaw = process.env.SMTP_PASS;
  const pass = passRaw
    ? stripWrappingQuotes(passRaw).replace(/\s+/g, "")
    : undefined;
  if (!host || !user || !pass) {
    console.warn("[alpha-mail] SMTP not configured");
    return null;
  }
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}
