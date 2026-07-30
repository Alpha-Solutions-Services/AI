import type { AlphaTool, ToolResult } from "@/lib/alpha/tools/types";
import {
  getAiUrl,
  getLearnDispatchUrl,
  getPortalUrl,
  getSiteUrl,
  getTmsUrl,
} from "@/lib/supabase/env";

export type ClientAction =
  | { type: "open_url"; url: string }
  | { type: "copy_text"; text: string }
  | { type: "speak"; text: string }
  | { type: "navigate"; path: string };

function withAction(
  summary: string,
  action: ClientAction,
  data?: unknown
): ToolResult {
  return {
    ok: true,
    summary,
    data: { ...(typeof data === "object" && data ? data : {}), clientAction: action },
  };
}

export const browserTools: AlphaTool[] = [
  {
    name: "browser_open_url",
    description:
      "Open a URL in the staff member's browser (new tab). Use for Alpha product sites or public pages.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
      },
      required: ["url"],
    },
    async execute(args): Promise<ToolResult> {
      const raw = String(args.url || "").trim();
      try {
        const u = new URL(raw);
        if (!["http:", "https:"].includes(u.protocol)) {
          return { ok: false, summary: "Only http(s) URLs", error: "bad_protocol" };
        }
        return withAction(`Opening ${u.hostname}`, {
          type: "open_url",
          url: u.toString(),
        });
      } catch {
        return { ok: false, summary: "Invalid URL", error: "bad_url" };
      }
    },
  },
  {
    name: "browser_open_alpha_app",
    description:
      "Open an Alpha Solutions app in the browser: marketing | portal | tms | learndispatch | ai. Optional path like /admin or /login.",
    risk: "read",
    parameters: {
      type: "object",
      properties: {
        app: {
          type: "string",
          description: "marketing | portal | tms | learndispatch | ai",
        },
        path: { type: "string" },
      },
      required: ["app"],
    },
    async execute(args): Promise<ToolResult> {
      const app = String(args.app || "").toLowerCase();
      const path = String(args.path || "/").startsWith("/")
        ? String(args.path || "/")
        : `/${args.path || ""}`;
      const bases: Record<string, string> = {
        marketing: getSiteUrl(),
        portal: getPortalUrl(),
        tms: getTmsUrl(),
        learndispatch: getLearnDispatchUrl(),
        learn: getLearnDispatchUrl(),
        ai: getAiUrl(),
      };
      const base = bases[app];
      if (!base) {
        return {
          ok: false,
          summary: "Unknown app",
          error: "Use marketing|portal|tms|learndispatch|ai",
        };
      }
      const url = `${base.replace(/\/$/, "")}${path}`;
      return withAction(`Opening ${app}${path}`, { type: "open_url", url });
    },
  },
  {
    name: "browser_copy_text",
    description: "Copy text to the staff member's clipboard.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
    async execute(args): Promise<ToolResult> {
      const text = String(args.text || "");
      return withAction("Copied to clipboard", { type: "copy_text", text });
    },
  },
  {
    name: "browser_speak",
    description: "Speak text aloud in the staff browser via Alpha TTS.",
    risk: "read",
    parameters: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
    async execute(args): Promise<ToolResult> {
      const text = String(args.text || "").slice(0, 1200);
      return withAction("Speaking", { type: "speak", text });
    },
  },
];

export function extractClientActions(toolResults: ToolResult[]): ClientAction[] {
  const actions: ClientAction[] = [];
  for (const r of toolResults) {
    const data = r.data as { clientAction?: ClientAction } | undefined;
    if (data?.clientAction) actions.push(data.clientAction);
  }
  return actions;
}
