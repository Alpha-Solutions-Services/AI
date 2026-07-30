import { getServiceRoleClient } from "@/lib/supabase/service-role";

export async function checkAndIncrementRateLimit(
  userId: string,
  max = 60,
  windowMs = 60_000
): Promise<boolean> {
  const db = getServiceRoleClient();
  if (!db) {
    console.warn("[rate-limit] service role unavailable — skipping limit");
    return true;
  }

  const now = new Date();
  const { data: existing, error: readErr } = await db
    .from("ai_rate_limits")
    .select("user_id, count, reset_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (readErr) {
    console.error("[rate-limit] read failed", readErr);
    return true;
  }

  const resetAt = existing?.reset_at
    ? new Date(existing.reset_at as string)
    : null;
  const windowExpired = !resetAt || now >= resetAt;

  if (!existing || windowExpired) {
    const nextReset = new Date(now.getTime() + windowMs).toISOString();
    const { error } = await db.from("ai_rate_limits").upsert(
      {
        user_id: userId,
        count: 1,
        reset_at: nextReset,
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("[rate-limit] upsert reset failed", error);
      return true;
    }
    return true;
  }

  const count = Number(existing.count) || 0;
  if (count >= max) return false;

  const { error } = await db
    .from("ai_rate_limits")
    .update({ count: count + 1 })
    .eq("user_id", userId)
    .eq("reset_at", existing.reset_at);

  if (error) {
    console.error("[rate-limit] increment failed", error);
    return true;
  }

  return true;
}
