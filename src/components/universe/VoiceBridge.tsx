"use client";

import { type ReactNode } from "react";
import { VoiceProvider } from "@/components/universe/VoiceProvider";
import { useUniverse } from "@/components/universe/UniverseProvider";

/** Wires VoiceProvider → Universe voice inbox (CommandBar consumes). */
export function VoiceBridge({ children }: { children: ReactNode }) {
  const { pushVoiceTranscript, setVoiceLevel } = useUniverse();

  return (
    <VoiceProvider
      onTranscript={pushVoiceTranscript}
      onLevel={setVoiceLevel}
    >
      {children}
    </VoiceProvider>
  );
}
