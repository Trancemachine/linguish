import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { demoStats, isSupabaseConfigured } from "@/lib/demo-data";
import type { StatsSummary } from "@/lib/types";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(demoStats);
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json(demoStats);
  }

  const supabase = await createClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions } = await supabase
    .from("practice_sessions")
    .select("type, duration_seconds, word_count, created_at")
    .eq("user_id", user.id)
    .gte("created_at", monthStart);

  const all = sessions ?? [];
  const today = all.filter((s) => s.created_at >= todayStart);

  const sum = (list: typeof all, type?: string) =>
    list.filter((s) => !type || s.type === type);

  const stats: StatsSummary = {
    today_words: sum(today, "words").reduce((a, s) => a + (s.word_count ?? 0), 0),
    today_dialogues: sum(today, "dialogue").length,
    today_duration_minutes: Math.round(
      today.reduce((a, s) => a + (s.duration_seconds ?? 0), 0) / 60
    ),
    month_words: sum(all, "words").reduce((a, s) => a + (s.word_count ?? 0), 0),
    month_dialogues: sum(all, "dialogue").length,
    month_duration_minutes: Math.round(
      all.reduce((a, s) => a + (s.duration_seconds ?? 0), 0) / 60
    ),
  };

  return NextResponse.json(stats);
}
