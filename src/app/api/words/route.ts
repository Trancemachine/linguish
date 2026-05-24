import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteHandlerUser } from "@/lib/auth";
import { demoWords, isSupabaseConfigured } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const kbIds = searchParams.get("knowledge_base_ids")?.split(",").filter(Boolean) ?? [];
  const docId = searchParams.get("document_id") ?? "";
  const filter = searchParams.get("filter") ?? "all";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(10000, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10")));

  if (!isSupabaseConfigured()) {
    let words = kbIds.length > 0
      ? demoWords.filter((w) => kbIds.includes(w.knowledge_base_id))
      : demoWords;

    if (filter === "starred") words = words.filter((w) => w.isStarred);
    if (filter === "review") words = words.filter((w) => !w.isStarred && !w.isMastered);
    if (search) words = words.filter((w) => w.spelling.toLowerCase().includes(search.toLowerCase()));

    const total = words.length;
    const paginated = words.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      words: paginated,
      pagination: { page, pageSize, total },
      stats: {
        newWords: words.filter((w) => w.isStarred).length,
        reviewWords: words.filter((w) => w.needsReview).length,
        masteredWords: words.filter((w) => w.isMastered).length,
        studyTime: "45m",
      },
    });
  }

  // Guest using default KB → serve from seed data
  const isGuestDefault = kbIds.includes("__default__");
  if (isGuestDefault) {
    const { getSeedWords } = await import("@/lib/seed-data");
    let words = getSeedWords().map((w: any, i: number) => ({
      id: `seed-${i}`,
      knowledge_base_id: "__default__",
      spelling: w.word,
      phonetic: "",
      partOfSpeech: "",
      definition: w.translation,
      exampleSentences: w.example ? [{ en: w.example, cn: "" }] : [],
      isNew: false,
      needsReview: true,
      isStarred: false,
      isMastered: false,
    }));

    if (filter === "starred") words = words.filter((w) => w.isStarred);
    if (filter === "review") words = words.filter((w) => !w.isStarred && !w.isMastered);
    if (search) words = words.filter((w) => w.spelling.toLowerCase().includes(search.toLowerCase()));

    const total = words.length;
    const paginated = words.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      words: paginated,
      pagination: { page, pageSize, total },
    });
  }

  const user = await getRouteHandlerUser();
  const supabase = createAdminClient();

  // Build query
  let query = supabase.from("words").select("*", { count: "exact" });

  if (kbIds.length > 0) {
    query = query.in("knowledge_base_id", kbIds);
  }
  if (docId) {
    query = query.eq("document_id", docId);
  }
  if (search) {
    query = query.or(`spelling.ilike.%${search}%,definition.ilike.%${search}%`);
  }

  // Get total count first
  const { count: total } = await query;

  // Get paginated results
  let dbQuery = supabase.from("words").select("*");

  if (kbIds.length > 0) {
    dbQuery = dbQuery.in("knowledge_base_id", kbIds);
  }
  if (docId) {
    dbQuery = dbQuery.eq("document_id", docId);
  }
  if (search) {
    dbQuery = dbQuery.or(`spelling.ilike.%${search}%,definition.ilike.%${search}%`);
  }

  // When multiple KBs, use distinct on spelling (union logic)
  if (kbIds.length > 1) {
    // Use a subquery approach: select all, deduplicate in memory
    const { data: allWords } = await dbQuery.order("created_at", { ascending: false });
    const unique = new Map<string, any>();
    for (const w of allWords ?? []) {
      if (!unique.has(w.spelling.toLowerCase())) {
        unique.set(w.spelling.toLowerCase(), w);
      }
    }
    const deduped = Array.from(unique.values());
    const total = deduped.length;
    const paginated = deduped.slice((page - 1) * pageSize, page * pageSize);

    const wordIds = paginated.map((w) => w.id);
    const statuses = user ? await getUserWordStatuses(supabase, user.id, wordIds) : new Map();

    return NextResponse.json({
      words: paginated.map((w) => mapWord(w, statuses)),
      pagination: { page, pageSize, total },
      stats: await computeStats(supabase, user?.id),
    });
  }

  // Single KB or no KB filter
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: words } = await dbQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  const wordIds = (words ?? []).map((w) => w.id);
  const statuses = user ? await getUserWordStatuses(supabase, user.id, wordIds) : new Map();

  // Apply filter post-query (for starred/review)
  let filtered = (words ?? []).map((w) => mapWord(w, statuses));
  if (filter === "starred") filtered = filtered.filter((w) => w.isStarred);
  if (filter === "review") filtered = filtered.filter((w) => w.needsReview && !w.isMastered);

  const pagination = { page, pageSize, total: total ?? 0 };

  return NextResponse.json({
    words: filtered,
    pagination,
    stats: await computeStats(supabase, user?.id),
  });
}

export async function POST(request: NextRequest) {
  const { spelling, phonetic, partOfSpeech, definition, exampleSentenceEn, exampleSentenceCn, knowledgeBaseId } = await request.json();

  if (!spelling || !definition || !knowledgeBaseId) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      id: `w_${Date.now()}`,
      knowledge_base_id: knowledgeBaseId,
      spelling,
      phonetic: phonetic ?? "",
      partOfSpeech: partOfSpeech ?? "",
      definition,
      exampleSentences: [{ en: exampleSentenceEn ?? "", cn: exampleSentenceCn ?? "" }],
      isNew: true,
      needsReview: false,
      isStarred: false,
      isMastered: false,
    });
  }

  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("words")
    .insert({
      knowledge_base_id: knowledgeBaseId,
      spelling: spelling.trim(),
      phonetic: phonetic?.trim() ?? null,
      part_of_speech: partOfSpeech?.trim() ?? null,
      definition: definition.trim(),
      example_sentence_en: exampleSentenceEn?.trim() ?? null,
      example_sentence_cn: exampleSentenceCn?.trim() ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapWord(data, new Map()));
}

// ---- Helpers ----

async function getUserWordStatuses(supabase: any, userId: string, wordIds: string[]) {
  if (wordIds.length === 0) return new Map();
  const { data } = await supabase
    .from("user_word_status")
    .select("word_id, status")
    .eq("user_id", userId)
    .in("word_id", wordIds);

  const map = new Map<string, string>();
  for (const s of data ?? []) map.set(s.word_id, s.status);
  return map;
}

function mapWord(w: any, statuses: Map<string, string>): any {
  const status = statuses.get(w.id);
  return {
    id: w.id,
    knowledge_base_id: w.knowledge_base_id,
    spelling: w.spelling,
    phonetic: w.phonetic ?? "",
    partOfSpeech: w.part_of_speech ?? "",
    definition: w.definition,
    exampleSentences: [
      {
        en: w.example_sentence_en ?? "",
        cn: w.example_sentence_cn ?? "",
      },
    ],
    isNew: status === "starred",
    needsReview: status !== "mastered",
    isStarred: status === "starred",
    isMastered: status === "mastered",
  };
}

async function computeStats(supabase: any, userId: string | undefined) {
  if (!userId) {
    return { newWords: 0, reviewWords: 0, masteredWords: 0, studyTime: "0m" };
  }

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  // newWords: starred today
  const { count: newWords } = await supabase
    .from("user_word_status")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "starred")
    .gte("updated_at", todayStart);

  // masteredWords: mastered today
  const { count: masteredWords } = await supabase
    .from("user_word_status")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "mastered")
    .gte("updated_at", todayStart);

  // studyTime from study_sessions
  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("duration_seconds")
    .eq("user_id", userId)
    .eq("module", "words")
    .gte("started_at", todayStart);

  const totalSeconds = (sessions ?? []).reduce((sum: number, s: any) => sum + (s.duration_seconds ?? 0), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const studyTime = minutes > 0 ? `${minutes}m` : `${Math.floor(totalSeconds / 60)}m`;

  return {
    newWords: newWords ?? 0,
    reviewWords: (newWords ?? 0) + (masteredWords ?? 0),
    masteredWords: masteredWords ?? 0,
    studyTime,
  };
}
