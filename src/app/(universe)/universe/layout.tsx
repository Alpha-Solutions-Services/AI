import { redirect } from "next/navigation";
import { UniverseProvider } from "@/components/universe/UniverseProvider";
import { VoiceBridge } from "@/components/universe/VoiceBridge";
import { UniverseShellClient } from "@/components/universe/UniverseShell";
import { isAlphaStaff } from "@/lib/staff/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Universe OS shell — separate from legacy "/" HudShell.
 */
export default async function UniverseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?next=/universe");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/universe");
  if (!(await isAlphaStaff(user))) {
    await supabase.auth.signOut();
    redirect("/login?error=auth&reason=not_staff");
  }

  return (
    <UniverseProvider>
      <VoiceBridge>
        <UniverseShellClient email={user.email}>{children}</UniverseShellClient>
      </VoiceBridge>
    </UniverseProvider>
  );
}
