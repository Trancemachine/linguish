export const DEMO_KB_ID = "demo-kb-1";
export const DEMO_USER_ID = "guest";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")
  );
}

export const demoWords = [
  {
    id: "demo-w-1",
    knowledge_base_id: DEMO_KB_ID,
    spelling: "algorithm",
    phonetic: "/ˈælɡərɪðəm/",
    partOfSpeech: "n.",
    definition: "算法",
    exampleSentences: [{ en: "This algorithm sorts data efficiently.", cn: "该算法高效排序数据。" }],
    isNew: false,
    needsReview: true,
    isStarred: false,
    isMastered: false,
  },
  {
    id: "demo-w-2",
    knowledge_base_id: DEMO_KB_ID,
    spelling: "database",
    phonetic: "/ˈdeɪtəbeɪs/",
    partOfSpeech: "n.",
    definition: "数据库",
    exampleSentences: [{ en: "The database stores millions of records.", cn: "数据库存储了数百万条记录。" }],
    isNew: true,
    needsReview: true,
    isStarred: true,
    isMastered: false,
  },
  {
    id: "demo-w-3",
    knowledge_base_id: DEMO_KB_ID,
    spelling: "neural",
    phonetic: "/ˈnjʊərəl/",
    partOfSpeech: "adj.",
    definition: "神经的",
    exampleSentences: [{ en: "Neural networks are inspired by the brain.", cn: "神经网络受到大脑的启发。" }],
    isNew: false,
    needsReview: false,
    isStarred: false,
    isMastered: true,
  },
  {
    id: "demo-w-4",
    knowledge_base_id: DEMO_KB_ID,
    spelling: "protocol",
    phonetic: "/ˈprəʊtəkɒl/",
    partOfSpeech: "n.",
    definition: "协议；规程",
    exampleSentences: [{ en: "The communication protocol ensures reliable data transfer.", cn: "通信协议确保可靠的数据传输。" }],
    isNew: false,
    needsReview: true,
    isStarred: false,
    isMastered: false,
  },
  {
    id: "demo-w-5",
    knowledge_base_id: DEMO_KB_ID,
    spelling: "bandwidth",
    phonetic: "/ˈbændwɪdθ/",
    partOfSpeech: "n.",
    definition: "带宽",
    exampleSentences: [{ en: "High bandwidth is required for video streaming.", cn: "视频流需要高带宽。" }],
    isNew: false,
    needsReview: false,
    isStarred: true,
    isMastered: false,
  },
];

