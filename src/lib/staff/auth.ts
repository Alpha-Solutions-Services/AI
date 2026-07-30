import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isOwnerEmail, isStaffEmail } from "@/lib/staff/allowlist";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export async function getSessionUser(): Promise<
  { user: User } | { error: NextResponse }
> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      error: NextResponse.json(
        { error: "Alpha auth is not configured" },
        { status: 503 }
      ),
    };
  }
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user };
}

export async function isAlphaStaff(user: User): Promise<boolean> {
  const email = user.email ?? null;
  if (isStaffEmail(email)) return true;

  const service = getServiceRoleClient();
  if (!service || !email) return false;

  const { data } = await service
    .from("portal_staff")
    .select("id, active")
    .eq("email", email.toLowerCase())
    .eq("active", true)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function requireAlphaStaff(): Promise<
  { user: User; isOwner: boolean } | { error: NextResponse }
> {
  const session = await getSessionUser();
  if ("error" in session) return session;

  const ok = await isAlphaStaff(session.user);
  if (!ok) {
    return {
      error: NextResponse.json(
        { error: "Staff access required" },
        { status: 403 }
      ),
    };
  }

  return {
    user: session.user,
    isOwner: isOwnerEmail(session.user.email),
  };
}
