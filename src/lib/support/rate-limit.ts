import { getServiceRoleClient } from "@/lib/supabase/service-role";

export async function checkSupportRateLimit(
  rateKey: string,
  max = 20,
  windowMs = 60_000
): Promise<boolean> {
  const db = getServiceRoleClient();
  if (!db) return true;

  const now = new Date();
  const { data: existing, error: readErr } = await db
    .from("support_rate_limits")
    .select("rate_key, count, reset_at")
    .eq("rate_key", rateKey)
    .maybeSingle();

  if (readErr) {
    console.error("[support-rate-limit] read failed");
    return true;
  }

  const resetAt = existing?.reset_at
    ? new Date(existing.reset_at as string)
    : null;
  const windowExpired = !resetAt || now >= resetAt;

  if (!existing || windowExpired) {
    const nextReset = new Date(now.getTime() + windowMs).toISOString();
    const { error } = await db.from("support_rate_limits").upsert(
      {
        rate_key: rateKey,
        count: 1,
        reset_at: nextReset,
      },
      { onConflict: "rate_key" }
    );
    if (error) {
      console.error("[support-rate-limit] upsert failed");
      return true;
    }
    return true;
  }

  const count = Number(existing.count) || 0;
  if (count >= max) return false;

  const { error } = await db
    .from("support_rate_limits")
    .update({ count: count + 1 })
    .eq("rate_key", rateKey)
    .eq("reset_at", existing.reset_at);

  if (error) {
    console.error("[support-rate-limit] increment failed");
    return true;
  }
  return true;
}
