import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { current_word_id } = await request.json();

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ id, current_word_id });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_bases")
    .update({ current_word_id })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, current_word_id: data.current_word_id });
}
