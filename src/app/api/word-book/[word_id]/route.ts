import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ word_id: string }> }
) {
  const { word_id } = await params;
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("word_book")
    .delete()
    .eq("user_id", user.id)
    .eq("word_id", word_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
