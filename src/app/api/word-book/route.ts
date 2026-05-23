import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { word_id, source = "manual" } = body;

  if (!word_id) {
    return NextResponse.json({ error: "缺少 word_id" }, { status: 400 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ id: `wb-${Date.now()}`, word_id, source });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("word_book")
    .upsert({ user_id: user.id, word_id, source }, { onConflict: "user_id,word_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
