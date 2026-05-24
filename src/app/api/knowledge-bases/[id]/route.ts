import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteHandlerUser } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }

  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("knowledge_bases")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const supabase = createAdminClient();
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
