export type AgentId =
  | "dispatch"
  | "finance"
  | "crm"
  | "portal"
  | "learn"
  | "knowledge"
  | "ops";

export type AgentRuntimeStatus =
  | "idle"
  | "processing"
  | "waiting"
  | "needs_approval";

export type UniverseAgentConfig = {
  id: AgentId;
  name: string;
  planetId: string;
  color: string;
  /** Orbit angle around Alpha Star (degrees) */
  angleDeg: number;
  radius: number;
};

export const UNIVERSE_AGENTS: UniverseAgentConfig[] = [
  {
    id: "dispatch",
    name: "Dispatch Agent",
    planetId: "dispatch",
    color: "#22D3EE",
    angleDeg: 20,
    radius: 0.42,
  },
  {
    id: "portal",
    name: "Portal Agent",
    planetId: "portal",
    color: "#3B82F6",
    angleDeg: 80,
    radius: 0.48,
  },
  {
    id: "learn",
    name: "Academy Agent",
    planetId: "learn-academy",
    color: "#8B5CF6",
    angleDeg: 140,
    radius: 0.44,
  },
  {
    id: "knowledge",
    name: "Knowledge Agent",
    planetId: "knowledge",
    color: "#A855F7",
    angleDeg: 200,
    radius: 0.46,
  },
  {
    id: "crm",
    name: "CRM Agent",
    planetId: "crm",
    color: "#22C55E",
    angleDeg: 260,
    radius: 0.5,
  },
  {
    id: "finance",
    name: "Finance Agent",
    planetId: "finance",
    color: "#FBBF24",
    angleDeg: 310,
    radius: 0.45,
  },
  {
    id: "ops",
    name: "Ops Agent",
    planetId: "intelligence",
    color: "#E8F4FF",
    angleDeg: 350,
    radius: 0.4,
  },
];

export function statusColor(status: AgentRuntimeStatus): string {
  switch (status) {
    case "processing":
      return "#22C55E";
    case "waiting":
      return "#F97316";
    case "needs_approval":
      return "#EF4444";
    default:
      return "#3B82F6";
  }
}
