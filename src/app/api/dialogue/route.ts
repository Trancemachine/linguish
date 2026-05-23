import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, chatCompletionStream, isAiConfigured } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { messages, stream } = await request.json();

  if (!isAiConfigured()) {
    return NextResponse.json({
      content: "请先配置 ANTHROPIC_API_KEY 以启用 AI 对话。",
    });
  }

  const systemMessage = {
    role: "system" as const,
    content:
      "You are an English interview coach for academic researchers. Keep responses concise, encouraging, and in English.",
  };
  const chatMessages = [
    systemMessage,
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  try {
    if (stream) {
      const generator = chatCompletionStream(chatMessages);
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of generator) {
              controller.enqueue(encoder.encode(chunk));
            }
          } finally {
            controller.close();
          }
        },
      });

      // Log practice session in background (fire-and-forget)
      const user = await getUser();
      if (user) {
        const supabase = await createClient();
        supabase.from("practice_sessions").insert({
          user_id: user.id,
          type: "dialogue",
          duration_seconds: 60,
        }).then(() => {}, () => {});
      }

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Non-streaming fallback
    const content = await chatCompletion(chatMessages);

    const user = await getUser();
    if (user) {
      const supabase = await createClient();
      await supabase.from("practice_sessions").insert({
        user_id: user.id,
        type: "dialogue",
        duration_seconds: 60,
      });
    }

    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI service error";
    return NextResponse.json({ content: message }, { status: 500 });
  }
}
