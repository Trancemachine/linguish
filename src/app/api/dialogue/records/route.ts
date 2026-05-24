import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteHandlerUser } from "@/lib/auth";

export async function GET() {
  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.json({ messages: [] });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("dialogue_records")
    .select("id, role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const messages = (data ?? []).map((r: any) => ({
    id: r.id,
    role: r.role as "user" | "assistant",
    content: r.content,
    created_at: r.created_at,
  }));

  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const { role, content } = await request.json();
  if (!role || !content) {
    return NextResponse.json({ error: "缺少 role 或 content" }, { status: 400 });
  }

  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dialogue_records")
    .insert({ user_id: user.id, role, content })
    .select("id, role, content, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}

export async function DELETE() {
  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();
  await supabase.from("dialogue_records").delete().eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
