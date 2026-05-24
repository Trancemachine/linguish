import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteHandlerUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/demo-data";
import { getSeedData, getSeedWords, DEFAULT_KB_NAME } from "@/lib/seed-data";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }

  const user = await getRouteHandlerUser();
  const supabase = createAdminClient();

  // Guest: return default KB from seed data
  if (!user) {
    const seed = getSeedData();
    if (!seed) return NextResponse.json([]);

    const words = getSeedWords();
    return NextResponse.json([
      {
        id: "__default__",
        name: seed.kb_name,
        description: "系统默认知识库（只读）",
        totalWords: words.length,
        docCount: seed.documents.length,
        created_at: seed.generated_at,
        isSystem: true,
        documents: seed.documents.map((d) => ({
          id: `__default__${d.file_name}`,
          knowledge_base_id: "__default__",
          file_name: d.file_name,
          file_path: "",
          wordCount: d.words.length,
          status: "completed",
          created_at: seed.generated_at,
        })),
      },
    ]);
  }

  // Logged-in user: check if they have the default KB, auto-seed if missing
  const { data: existingDefault } = await supabase
    .from("knowledge_bases")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", DEFAULT_KB_NAME)
    .maybeSingle();

  if (!existingDefault) {
    // Auto-seed (fire-and-forget)
    const { applySeedForUser } = await import("@/lib/seed-applier");
    applySeedForUser(user.id).catch(() => {});
  }

  // Fetch all KBs for the user
  const { data: bases } = await supabase
    .from("knowledge_bases")
    .select("id, name, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (!bases) return NextResponse.json([]);

  const result = await Promise.all(
    bases.map(async (kb) => {
      let totalWords = 0;
      try {
        const { count } = await supabase
          .from("words")
          .select("*", { count: "exact", head: true })
          .eq("knowledge_base_id", kb.id);
        totalWords = count ?? 0;
      } catch {}

      const { data: docs } = await supabase
        .from("documents")
        .select("id, file_name, file_path, word_count, status, created_at")
        .eq("knowledge_base_id", kb.id)
        .order("created_at", { ascending: false });

      return {
        id: kb.id,
        name: kb.name,
        description: kb.description ?? "",
        totalWords: totalWords ?? 0,
        docCount: docs?.length ?? 0,
        created_at: kb.created_at,
        isSystem: kb.name === DEFAULT_KB_NAME,
        documents: (docs ?? []).map((d) => ({
          id: d.id,
          knowledge_base_id: kb.id,
          file_name: d.file_name,
          file_path: d.file_path ?? "",
          wordCount: d.word_count ?? 0,
          status: d.status ?? "completed",
          created_at: d.created_at,
        })),
      };
    })
  );

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { name, description } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("knowledge_bases")
    .insert({ user_id: user.id, name: name.trim(), description: description?.trim() ?? null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    description: data.description ?? "",
    totalWords: 0,
    docCount: 0,
    created_at: data.created_at,
    documents: [],
  });
}
