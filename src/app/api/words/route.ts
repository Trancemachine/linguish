import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { demoWords, isSupabaseConfigured } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const kbId = request.nextUrl.searchParams.get("kb_id");

  if (!isSupabaseConfigured()) {
    const words = kbId
      ? demoWords.filter((w) => w.knowledge_base_id === kbId)
      : demoWords;
    return NextResponse.json(words.sort((a, b) => b.importance - a.importance));
  }

  const user = await getUser();
  if (!user) {
    const words = kbId
      ? demoWords.filter((w) => w.knowledge_base_id === kbId)
      : demoWords;
    return NextResponse.json(words.sort((a, b) => b.importance - a.importance));
  }

  if (!kbId) {
    return NextResponse.json({ error: "缺少 kb_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("word_lists")
    .select("*")
    .eq("knowledge_base_id", kbId)
    .order("importance", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((w) => ({
      id: w.id,
      knowledge_base_id: w.knowledge_base_id,
      word: w.word,
      translation: w.translation,
      example: w.example,
      importance: w.importance ?? 0,
    }))
  );
}
