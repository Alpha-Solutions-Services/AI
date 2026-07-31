/**
 * Typed Universe data contracts.
 * // TODO: replace with live query — Stage 3+ BFF using existing Alpha tool Supabase tables.
 */

export type ActivityEventType =
  | "load"
  | "invoice"
  | "lead"
  | "agent"
  | "backup"
  | "ticket"
  | "enrollment"
  | "system";

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  title: string;
  detail: string;
  planetId?: string;
  createdAt: string; // ISO
};

export type OverviewMetric = {
  id: string;
  label: string;
  value: string;
  delta: number; // percent, positive = up
  sparkline?: number[];
};

export type UniverseBadgeCounts = {
  notifications: number;
  messages: number;
  tasks: number;
};

export type UniverseHealth = {
  /** 0–100 */
  percent: number;
  label: string;
  activeProcesses: number;
  /** sparkline points for status card */
  sparkline: number[];
};

/** // TODO: replace with live metric from uptime / error-rate */
export const MOCK_UNIVERSE_HEALTH: UniverseHealth = {
  percent: 98.7,
  label: "Optimal Performance",
  activeProcesses: 124,
  sparkline: [62, 68, 65, 72, 70, 78, 74, 82, 80, 88, 85, 92, 90, 95, 98],
};

/** // TODO: replace with live counts from notifications / dm / tickets tables */
export const MOCK_BADGE_COUNTS: UniverseBadgeCounts = {
  notifications: 12,
  messages: 8,
  tasks: 14,
};

/** // TODO: replace with live aggregate queries (Portal deals, TMS loads, tickets, AI tool runs) */
export const MOCK_OVERVIEW: OverviewMetric[] = [
  {
    id: "revenue",
    label: "Total Revenue",
    value: "$128,430",
    delta: 12.4,
    sparkline: [40, 42, 45, 44, 50, 55, 52, 60, 58, 65, 70, 72],
  },
  {
    id: "loads",
    label: "Active Loads",
    value: "42",
    delta: 8.2,
  },
  {
    id: "tasks",
    label: "Open Tasks",
    value: "124",
    delta: 10.1,
  },
  {
    id: "accuracy",
    label: "AI Accuracy",
    value: "98.6%",
    delta: 0.4,
    sparkline: [88, 90, 91, 92, 93, 94, 95, 96, 97, 97.5, 98, 98.6],
  },
];

/** // TODO: replace with shared ActivityEvent bus pushed by modules / tool runs */
export const MOCK_ACTIVITY: ActivityEvent[] = [
  {
    id: "a1",
    type: "load",
    title: "New load assigned",
    detail: "LAX → PHX · Carrier confirmed",
    planetId: "dispatch",
    createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: "a2",
    type: "invoice",
    title: "Invoice #INV-2311 paid",
    detail: "$4,820 · Net 15 cleared",
    planetId: "finance",
    createdAt: new Date(Date.now() - 8 * 60_000).toISOString(),
  },
  {
    id: "a3",
    type: "lead",
    title: "New lead added",
    detail: "Freight Sales · Midwest broker",
    planetId: "freight-sales",
    createdAt: new Date(Date.now() - 15 * 60_000).toISOString(),
  },
  {
    id: "a4",
    type: "agent",
    title: "AI Agent completed task",
    detail: "Summarized TMS dispatcher queue",
    planetId: "intelligence",
    createdAt: new Date(Date.now() - 22 * 60_000).toISOString(),
  },
  {
    id: "a5",
    type: "ticket",
    title: "Portal ticket updated",
    detail: "Priority raised · waiting_client",
    planetId: "portal",
    createdAt: new Date(Date.now() - 36 * 60_000).toISOString(),
  },
  {
    id: "a6",
    type: "enrollment",
    title: "Academy enrollment",
    detail: "Learn Dispatch · Module 3 started",
    planetId: "learn-academy",
    createdAt: new Date(Date.now() - 48 * 60_000).toISOString(),
  },
  {
    id: "a7",
    type: "backup",
    title: "Backup completed",
    detail: "Knowledge crawl · nightly window",
    planetId: "knowledge",
    createdAt: new Date(Date.now() - 70 * 60_000).toISOString(),
  },
  {
    id: "a8",
    type: "system",
    title: "Universe health check",
    detail: "All critical orbits nominal",
    createdAt: new Date(Date.now() - 95 * 60_000).toISOString(),
  },
];

export function relativeTime(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
