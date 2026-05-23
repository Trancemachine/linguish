import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { demoKnowledgeBases, isSupabaseConfigured } from "@/lib/demo-data";
import type { KnowledgeBase } from "@/lib/types";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(demoKnowledgeBases);
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json(demoKnowledgeBases);
  }

  const supabase = await createClient();
  const { data: bases, error } = await supabase
    .from("knowledge_bases")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result: KnowledgeBase[] = [];
  for (const kb of bases ?? []) {
    const { data: docs } = await supabase
      .from("documents")
      .select("*")
      .eq("knowledge_base_id", kb.id)
      .order("created_at", { ascending: false });

    result.push({
      id: kb.id,
      name: kb.name,
      current_word_id: kb.current_word_id,
      created_at: kb.created_at,
      document_count: docs?.length ?? 0,
      documents: (docs ?? []).map((d) => ({
        id: d.id,
        knowledge_base_id: d.knowledge_base_id,
        file_name: d.file_name,
        file_hash: d.file_hash,
        status: d.status,
        created_at: d.created_at,
      })),
    });
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_bases")
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    current_word_id: data.current_word_id,
    created_at: data.created_at,
    document_count: 0,
    documents: [],
  });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("knowledge_bases")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
