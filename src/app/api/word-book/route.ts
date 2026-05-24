import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteHandlerUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { word_id, status: inputStatus, source = "manual" } = body;
  const status = inputStatus ?? "starred";

  if (!word_id) {
    return NextResponse.json({ error: "缺少 word_id" }, { status: 400 });
  }

  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.json({ id: `wb-${Date.now()}`, word_id, status });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_word_status")
    .upsert({ user_id: user.id, word_id, status }, { onConflict: "user_id,word_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
