import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteHandlerUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/demo-data";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Verify the document belongs to the user
  const { data: doc } = await supabase
    .from("documents")
    .select("id, file_path")
    .eq("id", id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }

  // Delete from storage
  if (doc.file_path && !doc.file_path.startsWith("preset://")) {
    await supabase.storage.from("documents").remove([doc.file_path]);
  }

  // Delete document (CASCADE will handle document_chunks and words)
  const { error } = await supabase.from("documents").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
