import type { PlanetId } from "@/config/planets.config";
import { getPlanet } from "@/config/planets.config";

export type AlphaIntentAction =
  | { type: "navigate"; path: string }
  | { type: "open_url"; url: string }
  | { type: "dispatch_query"; query?: string }
  | { type: "chat" };

export type AlphaIntent = {
  id: string;
  action: AlphaIntentAction;
  /** If set, UI must confirm before execute (mutations) */
  requiresConfirmation?: boolean;
  confirmationLabel?: string;
  reply?: string;
};

/**
 * Lightweight intent router — only intents backed by real functionality.
 * Falls through to /api/chat (Groq + tools) when no match.
 */
export function matchIntent(
  message: string,
  activePlanet?: PlanetId | null
): AlphaIntent | null {
  const t = message.trim().toLowerCase();
  if (!t) return null;

  if (
    /\b(open|go to|show|launch)\b.*\bdispatch\b/.test(t) ||
    /\bdispatch\b.*\b(module|planet|world)\b/.test(t)
  ) {
    return {
      id: "open_dispatch",
      action: { type: "navigate", path: "/universe/dispatch" },
      reply: "Opening Dispatch.",
    };
  }

  if (/\b(open|go to)\b.*\bportal\b/.test(t)) {
    return {
      id: "open_portal",
      action: { type: "navigate", path: "/universe/portal" },
      reply: "Opening Portal.",
    };
  }

  if (/\b(open|go to)\b.*\b(learn|academy)\b/.test(t)) {
    return {
      id: "open_learn",
      action: { type: "navigate", path: "/universe/learn-academy" },
      reply: "Opening Learn Academy.",
    };
  }

  if (/\b(open|go to)\b.*\bknowledge\b/.test(t)) {
    return {
      id: "open_knowledge",
      action: { type: "navigate", path: "/universe/knowledge" },
      reply: "Opening Knowledge.",
    };
  }

  if (/\b(open|go to)\b.*\b(settings|preferences)\b/.test(t)) {
    return {
      id: "open_settings",
      action: { type: "navigate", path: "/universe/settings" },
      reply: "Opening Settings.",
    };
  }

  if (
    /\b(galaxy|universe|home|star map)\b/.test(t) &&
    /\b(open|go|back|show)\b/.test(t)
  ) {
    return {
      id: "open_galaxy",
      action: { type: "navigate", path: "/universe" },
      reply: "Returning to the galaxy.",
    };
  }

  if (
    /\b(today'?s loads|active loads|dispatcher queue|show loads|list loads)\b/.test(
      t
    ) ||
    (activePlanet === "dispatch" && /\b(loads|queue)\b/.test(t))
  ) {
    return {
      id: "dispatch_loads",
      action: { type: "dispatch_query", query: "" },
      reply: "Pulling the dispatcher queue from TMS.",
    };
  }

  if (/\bopen\b.*\btms\b/.test(t)) {
    const p = getPlanet("dispatch");
    if (p?.externalUrl) {
      return {
        id: "open_tms_url",
        action: { type: "open_url", url: p.externalUrl },
        reply: "Opening TMS in a new tab.",
      };
    }
  }

  // Mutation example — always confirm (wired via chat tools for actual write)
  if (/\b(add|append)\b.*\bnote\b.*\bload\b/.test(t)) {
    return {
      id: "dispatch_note_confirm",
      action: { type: "chat" },
      requiresConfirmation: true,
      confirmationLabel:
        "This will ask Alpha to draft a load note — writes still need confirm in chat tools.",
      reply: "Load notes require confirmation. I'll route this through Alpha tools.",
    };
  }

  return null;
}
