import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { demoWordBook, isSupabaseConfigured } from "@/lib/demo-data";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(demoWordBook);
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json(demoWordBook);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("word_book")
    .select("id, word_id, source, word_lists(id, word, translation, example, importance, knowledge_base_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((entry) => {
      const w = entry.word_lists as unknown as {
        id: string;
        word: string;
        translation: string;
        example: string | null;
        importance: number;
        knowledge_base_id: string;
      };
      return {
        id: entry.id,
        word_id: entry.word_id,
        source: entry.source,
        word: {
          id: w.id,
          knowledge_base_id: w.knowledge_base_id,
          word: w.word,
          translation: w.translation,
          example: w.example,
          importance: w.importance ?? 0,
        },
      };
    })
  );
}
