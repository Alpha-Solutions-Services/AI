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
  extractClientActions,
  type ClientAction,
} from "@/lib/alpha/tools/browser";
import {
  cleanVoiceTranscript,
  isHearingCheck,
} from "@/lib/alpha/voice-text";
import {
  alphaGroqTools,
  createPendingToolRun,
  getAlphaTool,
  runToolImmediate,
} from "@/lib/alpha/tools/registry";
import type { ToolResult } from "@/lib/alpha/tools/types";
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

function truncateResult(result: ToolResult): ToolResult {
  const raw = JSON.stringify(result);
  if (raw.length <= 3500) return result;
  return {
    ok: result.ok,
    summary: result.summary,
    error: result.error,
    data: { truncated: true, preview: raw.slice(0, 2800) },
  };
}

export async function POST(req: NextRequest) {
  try {
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
    parsed = {
      ...parsed,
      message: cleanVoiceTranscript(parsed.message),
    };
    if (!parsed.message) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const groq = getGroq();
    if (!groq) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const service = getServiceRoleClient();
    if (!supabase || !service) {
      return NextResponse.json(
        { error: "Auth/DB not configured" },
        { status: 503 }
      );
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
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
    }

    await supabase.from("alpha_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: parsed.message,
    });

    // Only replay user/assistant text — replaying orphan tool rows breaks Groq.
    const { data: history } = await supabase
      .from("alpha_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(24);

    const chunks = await retrieveKnowledge(parsed.message, 6);
    const system = buildSystemPrompt(
      formatKnowledgeContext(chunks),
      session.user.email || session.user.id
    );

    const messages: ChatMessage[] = [
      { role: "system", content: system },
      ...(history || []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content || "").slice(0, 4000),
      })),
    ];

    const pendingConfirms: {
      runId: string;
      toolName: string;
      args: Record<string, unknown>;
      description: string;
    }[] = [];
    const turnResults: ToolResult[] = [];
    const clientActions: ClientAction[] = [];

    const ctx = { userId: session.user.id, email: session.user.email ?? null };
    let assistantText = "";
    let rounds = 0;
    const skipTools = isHearingCheck(parsed.message);

    while (rounds < 2) {
      rounds += 1;
      let completion;
      try {
        completion = await groq.chat.completions.create({
          model: getGroqModel(),
          messages: messages as never,
          ...(skipTools
            ? {}
            : { tools: alphaGroqTools() as never, tool_choice: "auto" as const }),
          temperature: skipTools ? 0.5 : 0.3,
          max_tokens: skipTools ? 400 : 1200,
        });
      } catch (err) {
        console.error("[alpha-chat] groq error", err);
        // Fallback without tools if tool schema/call fails
        const plain = await groq.chat.completions.create({
          model: getGroqModel(),
          messages: messages
            .filter((m) => m.role !== "tool")
            .map((m) => ({
              role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
              content: m.content,
            })) as never,
          temperature: 0.4,
          max_tokens: 800,
        });
        assistantText =
          plain.choices[0]?.message?.content ||
          "I hit a model error. Try a shorter question.";
        break;
      }

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
          args = JSON.parse(tc.function.arguments || "{}") as Record<
            string,
            unknown
          >;
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
            summary: `Write action “${tool.name}” awaits confirmation.`,
          };
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tool.name,
            content: JSON.stringify(placeholder),
          });
        } else {
          const result = truncateResult(
            await runToolImmediate(tool.name, args, ctx)
          );
          turnResults.push(result);
          clientActions.push(...extractClientActions([result]));
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
        }
      }

      if (pendingConfirms.length) {
        assistantText =
          choice.content?.trim() ||
          `I need your confirmation for: ${pendingConfirms
            .map((p) => p.toolName)
            .join(", ")}.`;
        break;
      }
    }

    if (!assistantText) {
      // One more plain completion after tool results
      try {
        const wrap = await groq.chat.completions.create({
          model: getGroqModel(),
          messages: messages as never,
          temperature: 0.3,
          max_tokens: 900,
        });
        assistantText =
          wrap.choices[0]?.message?.content ||
          (turnResults[0]?.summary
            ? `Done. ${turnResults[0].summary}`
            : "Done.");
      } catch {
        assistantText = turnResults[0]?.summary || "Done.";
      }
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
      clientActions,
      knowledgeHits: chunks.length,
    });
  } catch (err) {
    console.error("[alpha-chat] fatal", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Chat failed unexpectedly. Try again.",
      },
      { status: 500 }
    );
  }
}
