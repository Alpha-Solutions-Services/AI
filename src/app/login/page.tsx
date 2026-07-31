import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { isAlphaStaff } from "@/lib/staff/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && (await isAlphaStaff(user))) {
      redirect("/");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="alpha-ambient pointer-events-none absolute inset-0" />
      <div aria-hidden className="hud-scanlines pointer-events-none absolute inset-0 opacity-50" />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
