import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, chatCompletionStream, isAiConfigured } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteHandlerUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { messages, stream, knowledge_base_ids } = await request.json();

  if (!isAiConfigured()) {
    return NextResponse.json({
      content: "请先配置 ANTHROPIC_API_KEY 以启用 AI 对话。",
    });
  }

  let kbContext = "";
  if (knowledge_base_ids?.length > 0) {
    try {
      const supabase = createAdminClient();
      const { data: words } = await supabase
        .from("words")
        .select("spelling, definition, example_sentence_en")
        .in("knowledge_base_id", knowledge_base_ids)
        .limit(30);

      if (words && words.length > 0) {
        kbContext =
          "\n\nHere are some vocabulary words from the user's selected knowledge base that you can try to use in the conversation:\n" +
          (words as any[])
            .map(
              (w: any) =>
                `- ${w.spelling}: ${w.definition}${w.example_sentence_en ? ` (e.g. "${w.example_sentence_en}")` : ""}`,
            )
            .join("\n");
      }
    } catch {
      // KB context is optional
    }
  }

  const systemMessage = {
    role: "system" as const,
    content:
      "You are an English interview coach for academic researchers. Keep responses concise (2-4 sentences), encouraging, and in English. IMPORTANT: Use ONLY plain text. NEVER use asterisks, backticks, or any markdown formatting symbols." +
      kbContext,
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
              controller.enqueue(encoder.encode(chunk.replace(/\*/g, "")));
            }
          } finally {
            controller.close();
          }
        },
      });

      // Log practice session in background (fire-and-forget)
      const user = await getRouteHandlerUser();
      if (user) {
        const supabase = createAdminClient();
        supabase.from("study_sessions").insert({
          user_id: user.id,
          module: "dialogue",
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
    const rawContent = await chatCompletion(chatMessages);
    const content = rawContent.replace(/\*/g, "");

    const user = await getRouteHandlerUser();
    if (user) {
      const supabase = createAdminClient();
      await supabase.from("study_sessions").insert({
        user_id: user.id,
        module: "dialogue",
        duration_seconds: 60,
      });
    }

    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI service error";
    return NextResponse.json({ content: message }, { status: 500 });
  }
}
