import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

let warmedUp = false;

export async function GET() {
  // Warm up Supabase connection with a trivial query
  if (!warmedUp) {
    const supabase = createAdminClient();
    await supabase.from("knowledge_bases").select("id", { count: "exact", head: true }).limit(1);
    warmedUp = true;
  }
  return NextResponse.json({ ok: true });
}
