import type { ComponentType } from "react";

/**
 * Alpha Universe planet registry.
 *
 * HOW TO ADD / ENABLE A PLANET LATER
 * ---------------------------------
 * 1. Create `src/components/universe/modules/<id>Module.tsx` (or reuse an existing page shell).
 * 2. Copy a stub entry below (or uncomment freight-sales once env + tools exist).
 * 3. Set `enabled: true`, pick `statusSource` (`tms` | `sales` | `portal` | `learn` | `ai` | `mock`),
 *    fill `ModuleComponent: () => import("...")`, and set `orbit` / `theme`.
 * 4. No new layout or route-group code is required — Stage 2+ reads this array.
 *
 * Freight Sales: set `enabled: true` and add NEXT_PUBLIC_FREIGHTSALES_URL + sales tools
 * when product decides to wire it for first ship.
 */

export type PlanetId =
  | "dispatch"
  | "freight-sales"
  | "finance"
  | "crm"
  | "knowledge"
  | "automation"
  | "portal"
  | "analytics"
  | "integrations"
  | "learn-academy"
  | "intelligence"
  | "settings"
  | string;

export type PlanetStatusSource =
  | "tms"
  | "sales"
  | "portal"
  | "learn"
  | "ai"
  | "mock";

export type PlanetConfig = {
  id: PlanetId;
  name: string;
  subtitle: string;
  theme: { primary: string; glow: string; rings?: boolean };
  orbit: { radius: number; angleDeg: number; speed: number };
  /** Lucide icon name (e.g. "Truck", "Brain") */
  icon: string;
  /** In-app Universe route, e.g. "/universe/dispatch" */
  route: string;
  /** Sibling product URL when relevant (deep-link / open-in-browser) */
  externalUrl?: string;
  statusSource: PlanetStatusSource;
  /**
   * Lazy module import for next/dynamic.
   * Stage 1 uses PlanetPlaceholder for all entries.
   * Stage 3+ swaps ModuleComponent to real BFF-backed shells
   * (reuse existing Supabase queries from chat tools — not iframes).
   */
  ModuleComponent: () => Promise<{ default: ComponentType }>;
  enabled: boolean;
};

const loadPlaceholder = () =>
  import("@/components/universe/PlanetPlaceholder");

/**
 * Seeded from Stage 0 audit. Enabled = real backing exists in AI tools / pages.
 * Disabled = stub for galaxy layout only until data/tools ship.
 */
export const PLANETS: PlanetConfig[] = [
  {
    id: "intelligence",
    name: "Intelligence",
    subtitle: "AI Brain & Reasoning",
    theme: { primary: "#E8F4FF", glow: "rgba(232, 244, 255, 0.45)", rings: true },
    orbit: { radius: 1.05, angleDeg: -90, speed: 0.12 },
    icon: "Brain",
    route: "/universe/intelligence",
    statusSource: "ai",
    ModuleComponent: loadPlaceholder,
    enabled: true,
  },
  {
    id: "analytics",
    name: "Analytics",
    subtitle: "Insights & Reports",
    theme: { primary: "#A8D4F0", glow: "rgba(168, 212, 240, 0.4)", rings: true },
    orbit: { radius: 1.15, angleDeg: -145, speed: 0.1 },
    icon: "BarChart3",
    route: "/universe/analytics",
    statusSource: "mock",
    ModuleComponent: loadPlaceholder,
    enabled: false,
  },
  {
    id: "knowledge",
    name: "Knowledge",
    subtitle: "Documents & Memory",
    theme: { primary: "#A855F7", glow: "rgba(168, 85, 247, 0.45)", rings: true },
    orbit: { radius: 1.15, angleDeg: -35, speed: 0.11 },
    icon: "BookOpen",
    route: "/universe/knowledge",
    statusSource: "ai",
    ModuleComponent: loadPlaceholder,
    enabled: true,
  },
  {
    id: "crm",
    name: "CRM",
    subtitle: "Customers & Deals",
    theme: { primary: "#22C55E", glow: "rgba(34, 197, 94, 0.4)" },
    orbit: { radius: 1.25, angleDeg: 160, speed: 0.09 },
    icon: "Users",
    route: "/universe/crm",
    statusSource: "mock",
    ModuleComponent: loadPlaceholder,
    enabled: false,
  },
  {
    id: "automation",
    name: "Automation",
    subtitle: "Workflows & Agents",
    theme: { primary: "#3B82F6", glow: "rgba(59, 130, 246, 0.5)" },
    orbit: { radius: 1.25, angleDeg: 20, speed: 0.13 },
    icon: "Bot",
    route: "/universe/automation",
    statusSource: "mock",
    ModuleComponent: loadPlaceholder,
    enabled: false,
  },
  {
    id: "dispatch",
    name: "Dispatch",
    subtitle: "Loads & Drivers",
    theme: { primary: "#22D3EE", glow: "rgba(34, 211, 238, 0.5)" },
    orbit: { radius: 1.35, angleDeg: 125, speed: 0.14 },
    icon: "Truck",
    route: "/universe/dispatch",
    externalUrl:
      process.env.NEXT_PUBLIC_TMS_URL?.trim() ||
      "https://tms.alphasolutions.software",
    statusSource: "tms",
    ModuleComponent: () =>
      import("@/components/universe/modules/DispatchModule"),
    enabled: true,
  },
  {
    id: "freight-sales",
    name: "Freight Sales",
    subtitle: "Leads & Pipeline",
    theme: { primary: "#F97316", glow: "rgba(249, 115, 22, 0.5)", rings: true },
    orbit: { radius: 1.35, angleDeg: 55, speed: 0.12 },
    icon: "Target",
    route: "/universe/freight-sales",
    // Wire when product adds NEXT_PUBLIC_FREIGHTSALES_URL + sales tools.
    // externalUrl: process.env.NEXT_PUBLIC_FREIGHTSALES_URL,
    externalUrl: "https://freightsales.alphasolutions.software",
    statusSource: "sales",
    ModuleComponent: loadPlaceholder,
    enabled: false,
  },
  {
    id: "learn-academy",
    name: "Learn Academy",
    subtitle: "Training & Courses",
    theme: { primary: "#8B5CF6", glow: "rgba(139, 92, 246, 0.45)" },
    orbit: { radius: 1.45, angleDeg: -160, speed: 0.08 },
    icon: "GraduationCap",
    route: "/universe/learn-academy",
    externalUrl:
      process.env.NEXT_PUBLIC_LEARN_DISPATCH_URL?.trim() ||
      "https://learndispatch.alphasolutions.software",
    statusSource: "learn",
    ModuleComponent: () =>
      import("@/components/universe/modules/LearnModule"),
    enabled: true,
  },
  {
    id: "finance",
    name: "Finance",
    subtitle: "Invoicing & Payments",
    theme: { primary: "#FBBF24", glow: "rgba(251, 191, 36, 0.45)" },
    orbit: { radius: 1.45, angleDeg: -120, speed: 0.09 },
    icon: "Wallet",
    route: "/universe/finance",
    statusSource: "mock",
    ModuleComponent: loadPlaceholder,
    enabled: false,
  },
  {
    id: "portal",
    name: "Portal",
    subtitle: "Customer Portal",
    theme: { primary: "#3B82F6", glow: "rgba(59, 130, 246, 0.45)", rings: true },
    orbit: { radius: 1.45, angleDeg: -60, speed: 0.1 },
    icon: "LayoutDashboard",
    route: "/universe/portal",
    externalUrl:
      process.env.NEXT_PUBLIC_PORTAL_URL?.trim() ||
      "https://portal.alphasolutions.software",
    statusSource: "portal",
    ModuleComponent: () =>
      import("@/components/universe/modules/PortalModule"),
    enabled: true,
  },
  {
    id: "integrations",
    name: "Integrations",
    subtitle: "Apps & Connections",
    theme: { primary: "#94A3B8", glow: "rgba(148, 163, 184, 0.4)" },
    orbit: { radius: 1.45, angleDeg: 0, speed: 0.07 },
    icon: "Network",
    route: "/universe/integrations",
    statusSource: "mock",
    ModuleComponent: loadPlaceholder,
    enabled: false,
  },
  {
    id: "settings",
    name: "Settings",
    subtitle: "Preferences & Voice",
    theme: { primary: "#64748B", glow: "rgba(100, 116, 139, 0.35)" },
    orbit: { radius: 1.55, angleDeg: 90, speed: 0.06 },
    icon: "Settings",
    route: "/universe/settings",
    statusSource: "mock",
    ModuleComponent: loadPlaceholder,
    enabled: true,
  },
];

export function getPlanet(id: PlanetId): PlanetConfig | undefined {
  return PLANETS.find((p) => p.id === id);
}

export function getEnabledPlanets(): PlanetConfig[] {
  return PLANETS.filter((p) => p.enabled);
}

export function getPlanetByRoute(pathname: string): PlanetConfig | undefined {
  return PLANETS.find(
    (p) => p.route === pathname || pathname.startsWith(`${p.route}/`)
  );
}
