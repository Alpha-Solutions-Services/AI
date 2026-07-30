import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGroq, getGroqModel } from "@/lib/alpha/groq";
import { checkAndIncrementRateLimit } from "@/lib/alpha/rate-limit";
import {
  formatKnowledgeContext,
  retrieveKnowledge,
} from "@/lib/alpha/retrieve";
import { buildSystemPrompt } from "@/lib/alpha/system-prompt";
import {
  alphaGroqTools,
  createPendingToolRun,
  getAlphaTool,
  runToolImmediate,
} from "@/lib/alpha/tools/registry";
import { requireAlphaStaff } from "@/lib/staff/auth";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  message: z.string().min(1).max(8000),
  conversationId: z.string().uuid().optional(),
});

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
};

export async function POST(req: NextRequest) {
  const session = await requireAlphaStaff();
  if ("error" in session) return session.error;

  if (!(await checkAndIncrementRateLimit(session.user.id))) {
    return NextResponse.json(
      { error: "Too many messages — try again shortly." },
      { status: 429 }
    );
  }

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const groq = getGroq();
  if (!groq) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const service = getServiceRoleClient();
  if (!supabase || !service) {
    return NextResponse.json({ error: "Auth/DB not configured" }, { status: 503 });
  }

  let conversationId = parsed.conversationId;
  if (!conversationId) {
    const { data, error } = await supabase
      .from("alpha_conversations")
      .insert({
        user_id: session.user.id,
        staff_email: session.user.email ?? null,
        title: parsed.message.slice(0, 60),
      })
      .select("id")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: "Could not start chat", detail: error?.message },
        { status: 500 }
      );
    }
    conversationId = data.id as string;
  } else {
    const { data: conv } = await supabase
      .from("alpha_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
  }

  await supabase.from("alpha_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: parsed.message,
  });

  const { data: history } = await supabase
    .from("alpha_messages")
    .select("role, content, tool_name, tool_call_id, metadata")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(40);

  const chunks = await retrieveKnowledge(parsed.message, 8);
  const system = buildSystemPrompt(
    formatKnowledgeContext(chunks),
    session.user.email || session.user.id
  );

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...(history || [])
      .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "tool")
      .map((m) => {
        if (m.role === "tool") {
          return {
            role: "tool" as const,
            content: m.content,
            tool_call_id: m.tool_call_id || "tool",
            name: m.tool_name || undefined,
          };
        }
        return {
          role: m.role as "user" | "assistant",
          content: m.content,
        };
      }),
  ];

  const pendingConfirms: {
    runId: string;
    toolName: string;
    args: Record<string, unknown>;
    description: string;
  }[] = [];

  const ctx = { userId: session.user.id, email: session.user.email ?? null };
  let assistantText = "";
  let rounds = 0;

  while (rounds < 4) {
    rounds += 1;
    const completion = await groq.chat.completions.create({
      model: getGroqModel(),
      messages: messages as never,
      tools: alphaGroqTools() as never,
      tool_choice: "auto",
      temperature: 0.4,
      max_tokens: 2048,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) break;

    const toolCalls = choice.tool_calls || [];
    if (!toolCalls.length) {
      assistantText = choice.content || "";
      break;
    }

    messages.push({
      role: "assistant",
      content: choice.content || "",
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
    });

    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        args = {};
      }
      const tool = getAlphaTool(tc.function.name);
      if (!tool) {
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify({ ok: false, error: "unknown_tool" }),
        });
        continue;
      }

      if (tool.risk === "write") {
        const run = await createPendingToolRun({
          conversationId,
          userId: session.user.id,
          toolName: tool.name,
          args,
        });
        pendingConfirms.push({
          runId: run.id,
          toolName: tool.name,
          args,
          description: tool.description,
        });
        const placeholder = {
          ok: true,
          pending_confirmation: true,
          runId: run.id,
          summary: `Write action “${tool.name}” awaits your confirmation in the UI.`,
        };
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tool.name,
          content: JSON.stringify(placeholder),
        });
        await service.from("alpha_messages").insert({
          conversation_id: conversationId,
          role: "tool",
          content: JSON.stringify(placeholder),
          tool_name: tool.name,
          tool_call_id: tc.id,
          metadata: { pending: true, runId: run.id },
        });
      } else {
        const result = await runToolImmediate(tool.name, args, ctx);
        await service.from("alpha_tool_runs").insert({
          conversation_id: conversationId,
          user_id: session.user.id,
          tool_name: tool.name,
          args,
          result,
          status: result.ok ? "executed" : "failed",
          error: result.error ?? null,
          executed_at: new Date().toISOString(),
        });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tool.name,
          content: JSON.stringify(result),
        });
        await service.from("alpha_messages").insert({
          conversation_id: conversationId,
          role: "tool",
          content: JSON.stringify(result),
          tool_name: tool.name,
          tool_call_id: tc.id,
        });
      }
    }

    if (pendingConfirms.length) {
      // Ask model to narrate pending confirms, then stop so user can approve.
      const wrap = await groq.chat.completions.create({
        model: getGroqModel(),
        messages: [
          ...messages,
          {
            role: "user",
            content:
              "Some write tools are waiting for my confirmation. Briefly tell me what you want to do and wait.",
          },
        ] as never,
        temperature: 0.3,
        max_tokens: 600,
      });
      assistantText = wrap.choices[0]?.message?.content || "Confirm the pending actions to continue.";
      break;
    }
  }

  if (!assistantText) {
    assistantText = "I could not generate a reply. Try again.";
  }

  await supabase.from("alpha_messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: assistantText,
  });
  await supabase
    .from("alpha_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return NextResponse.json({
    conversationId,
    reply: assistantText,
    pendingConfirms,
    knowledgeHits: chunks.length,
  });
}
