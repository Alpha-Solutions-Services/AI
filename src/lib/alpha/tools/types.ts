export type ToolRisk = "read" | "write";

export type ToolContext = {
  userId: string;
  email: string | null;
};

export type ToolResult = {
  ok: boolean;
  summary: string;
  data?: unknown;
  error?: string;
};

export type AlphaTool = {
  name: string;
  description: string;
  risk: ToolRisk;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
};

export function groqToolDefs(tools: AlphaTool[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}
