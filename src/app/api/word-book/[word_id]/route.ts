import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteHandlerUser } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ word_id: string }> }
) {
  const { word_id } = await params;
  const user = await getRouteHandlerUser();

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_word_status")
    .delete()
    .eq("user_id", user.id)
    .eq("word_id", word_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
