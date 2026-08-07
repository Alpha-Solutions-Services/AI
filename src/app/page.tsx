import { redirect } from "next/navigation";
import { DashboardHome } from "@/components/alpha/DashboardHome";
import { AppShell } from "@/components/alpha/AppShell";
import { isAlphaStaff } from "@/lib/staff/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAlphaStaff(user))) {
    await supabase.auth.signOut();
    redirect("/login?error=auth&reason=not_staff");
  }

  return (
    <AppShell email={user.email} centerOnly>
      <DashboardHome />
    </AppShell>
  );
}
