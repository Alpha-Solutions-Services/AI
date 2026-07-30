"use client";

import { Suspense } from "react";
import { HudShell } from "@/components/alpha/HudShell";

export function AppShell({
  children,
  email,
  centerOnly = true,
}: {
  children: React.ReactNode;
  email?: string | null;
  centerOnly?: boolean;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#050a12] text-sm text-[#6a9bbb]">
          Loading Alpha HUD…
        </div>
      }
    >
      <HudShell email={email} centerOnly={centerOnly}>
        {children}
      </HudShell>
    </Suspense>
  );
}
