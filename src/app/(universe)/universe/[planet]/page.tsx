"use client";

import { useEffect, useState, type ComponentType } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getPlanet } from "@/config/planets.config";
import { PlanetModuleShell } from "@/components/universe/PlanetModuleShell";

const METRICS: Record<string, Array<{ label: string; value: string }>> = {
  portal: [
    { label: "Source", value: "Portal tools" },
    { label: "Module", value: "Placeholder" },
  ],
  "learn-academy": [
    { label: "Source", value: "Academy tools" },
    { label: "Module", value: "Placeholder" },
  ],
  knowledge: [
    { label: "Source", value: "AI index" },
    { label: "Module", value: "Placeholder" },
  ],
  intelligence: [
    { label: "Model", value: "Groq" },
    { label: "Tools", value: "Online" },
  ],
  settings: [
    { label: "TTS", value: "Browser" },
    { label: "Auth", value: "Supabase" },
  ],
};

const ACTIONS: Record<string, string> = {
  dispatch: "Refresh Queue",
  "freight-sales": "+ New Lead",
  portal: "+ New Ticket",
  "learn-academy": "+ Enroll Student",
  knowledge: "Refresh Knowledge",
  intelligence: "Open Live Talk",
  settings: "Voice Preferences",
};

export default function PlanetPage({
  params,
}: {
  params: { planet: string };
}) {
  const planet = getPlanet(params.planet);
  if (!planet) notFound();

  const [Module, setModule] = useState<ComponentType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setModule(null);
    setLoadError(null);
    void planet
      .ModuleComponent()
      .then((m) => {
        if (!cancelled) setModule(() => m.default);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load module"
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [planet]);

  const metrics = METRICS[planet.id] ?? [
    { label: "Status", value: planet.enabled ? "Online" : "Standby" },
    { label: "Source", value: planet.statusSource },
  ];

  return (
    <PlanetModuleShell
      planet={planet}
      metrics={planet.id === "dispatch" ? undefined : metrics}
      primaryAction={
        ACTIONS[planet.id]
          ? { label: ACTIONS[planet.id] }
          : { label: "Coming online" }
      }
    >
      {loadError ? (
        <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {loadError}
        </p>
      ) : Module ? (
        <Module />
      ) : (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 size={18} className="animate-spin" />
          Loading module…
        </div>
      )}
    </PlanetModuleShell>
  );
}
