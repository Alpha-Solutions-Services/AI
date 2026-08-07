import { redirect } from "next/navigation";
import { isAlphaStaff } from "@/lib/staff/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?next=/support");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/support");
  if (!(await isAlphaStaff(user))) {
    await supabase.auth.signOut();
    redirect("/login?error=auth&reason=not_staff");
  }

  return <>{children}</>;
}
