"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import {
  Volume2,
  CheckCircle,
  Star,
  ChevronDown,
  ChevronUp,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn, speakWord } from "@/lib/utils";

interface KbItem {
  id: string;
  name: string;
  totalWords: number;
}

interface WordItem {
  id: string;
  knowledge_base_id: string;
  spelling: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  exampleSentences: Array<{ en: string; cn: string }>;
  isNew: boolean;
  needsReview: boolean;
  isStarred: boolean;
  isMastered: boolean;
}

interface WordsResponse {
  words: WordItem[];
  pagination: { page: number; pageSize: number; total: number };
}

export default function WordsPracticePage() {
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>([]);
  const [words, setWords] = useState<WordItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "review" | "starred">("all");
  const [vocabSearch, setVocabSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [kbDropdownOpen, setKbDropdownOpen] = useState(false);

  // SWR: fetch knowledge bases with global caching
  const { data: bases = [] } = useSWR<KbItem[]>("/api/knowledge-bases", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  // Auto-select first KB on initial load
  useEffect(() => {
    if (bases.length > 0 && selectedKbIds.length === 0) {
      setSelectedKbIds([bases[0].id]);
    }
  }, [bases]);

  // SWR: fetch words when KB or filter changes
  const swrKey = selectedKbIds.length > 0
    ? `/api/words?knowledge_base_ids=${selectedKbIds.join(",")}&filter=${filter}&pageSize=500`
    : null;

  const { data: wordsData, isLoading } = useSWR<WordsResponse>(swrKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  // Clear stale data and reset page when filter/KB changes
  useEffect(() => {
    setCurrentPage(1);
    setWords([]);
  }, [swrKey]);

  // Sync SWR words data to local state (supports optimistic updates)
  useEffect(() => {
    if (wordsData?.words) {
      setWords(wordsData.words);
    }
  }, [wordsData]);

  // First-visit auto-demo tour
  useEffect(() => {
    if (typeof window === "undefined") return;
    // If no words, empty KB — let the user discover on their own
    if (!wordsData?.words || wordsData.words.length === 0) return;
    if (localStorage.getItem("linguish_tour_done")) return;
    localStorage.setItem("linguish_tour_done", "1");

    import("@/lib/tour").then(async ({ waitForElements, sleep }) => {
      const cards = await waitForElements('[data-tour="word-card"]', 15000);
      if (cards.length === 0) return;

      const card = cards[0] as HTMLElement;
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      await sleep(600);

      // Click to expand word card
      card.click();
      await sleep(1200);

      // Click mastered button
      const mastered = card.querySelector('[title="标记掌握"]') as HTMLElement;
      mastered?.click();
      await sleep(1000);

      // Click star button
      const star = card.querySelector('[title="生词本关注"]') as HTMLElement;
      star?.click();
      await sleep(800);

      // Navigate to dialogue practice
      window.location.href = "/practice/dialogue";
    });
  }, [wordsData]);

  // Computed counts for filter tabs
  const totalCount = words.length;
  const reviewCount = words.filter((w) => !w.isMastered && !w.isStarred).length;
  const starredCount = words.filter((w) => w.isStarred).length;

  // Filter by search + pagination
  const matchingWords = useMemo(() => {
    return words.filter((w) => {
      if (!vocabSearch) return true;
      const q = vocabSearch.toLowerCase();
      return (
        w.spelling.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q)
      );
    });
  }, [words, vocabSearch]);

  const itemsPerPage = 11;
  const totalPages = Math.max(1, Math.ceil(matchingWords.length / itemsPerPage));
  const paginatedWords = matchingWords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // --- Actions ---

  function handleSound(text: string, e: React.MouseEvent) {
    e.stopPropagation();
    speakWord(text);
  }

  async function toggleMastered(word: WordItem) {
    const next = !word.isMastered;
    setWords((prev) =>
      prev.map((w) =>
        w.id === word.id
          ? { ...w, isMastered: next, isStarred: next ? false : w.isStarred }
          : w,
      ),
    );
    try {
      if (next) {
        await fetch("/api/word-book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word_id: word.id, status: "mastered", source: "manual" }),
        });
      } else {
        await fetch(`/api/word-book/${word.id}`, { method: "DELETE" });
      }
    } catch {
      setWords((prev) =>
        prev.map((w) =>
          w.id === word.id ? { ...w, isMastered: !next, isStarred: word.isStarred } : w,
        ),
      );
    }
  }

  async function toggleStarred(word: WordItem) {
    const next = !word.isStarred;
    setWords((prev) =>
      prev.map((w) =>
        w.id === word.id
          ? { ...w, isStarred: next, isMastered: next ? false : w.isMastered }
          : w,
      ),
    );
    try {
      if (next) {
        await fetch("/api/word-book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word_id: word.id, source: "manual" }),
        });
      } else {
        await fetch(`/api/word-book/${word.id}`, { method: "DELETE" });
      }
    } catch {
      setWords((prev) =>
        prev.map((w) =>
          w.id === word.id ? { ...w, isStarred: !next, isMastered: word.isMastered } : w,
        ),
      );
    }
  }

  function toggleKb(kbId: string) {
    setSelectedKbIds((prev) =>
      prev.includes(kbId) ? prev.filter((id) => id !== kbId) : [...prev, kbId],
    );
  }

  const displayLabel =
    selectedKbIds.length === 0
      ? "请选择知识库"
      : selectedKbIds.length === 1
        ? bases.find((b) => b.id === selectedKbIds[0])?.name ?? "已选择 1 个知识库"
        : `已选择 ${selectedKbIds.length} 个知识库`;

  return (
    <AppShell title="单词练习" subtitle="点击单词展开详情，支持发音与进度标记">
      <div className="flex flex-col flex-1 min-h-0 pb-4">
        {/* Filter Tabs + KB Selector + Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm">
          <div className="flex gap-2 ml-2">
            {[
              { id: "all" as const, label: "全部单词", count: totalCount },
              { id: "review" as const, label: "待复习", count: reviewCount },
              { id: "starred" as const, label: "生词本", count: starredCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap",
                  filter === tab.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                )}
              >
                {tab.label}{" "}
                <span
                  className={cn(
                    filter === tab.id ? "text-blue-200" : "text-slate-400",
                    "font-normal",
                  )}
                >
                  ({tab.count})
                </span>
              </button>
            ))}
          </div>

          {/* KB Selector */}
          <div className="relative shrink-0">
            <button
              onClick={() => setKbDropdownOpen(!kbDropdownOpen)}
              className="bg-white border border-slate-200 text-slate-600 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 hover:border-slate-300 transition-colors"
            >
              <span className="truncate max-w-[120px]">{displayLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {kbDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setKbDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-64 overflow-y-auto p-2.5 space-y-1">
                  {bases.map((kb) => {
                    const checked = selectedKbIds.includes(kb.id);
                    return (
                      <label
                        key={kb.id}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-xs sm:text-sm font-semibold text-slate-700 select-none"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleKb(kb.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className={checked ? "text-blue-600 font-bold" : ""}>
                          {kb.name} ({kb.totalWords})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="relative w-full sm:w-56 ml-auto">
            <input
              type="text"
              value={vocabSearch}
              onChange={(e) => {
                setVocabSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="搜索词汇..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Words List */}
        <div className="flex-1 flex flex-col min-h-0 mt-2">
          {isLoading ? (
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-xs font-bold text-slate-400">
              加载中...
            </div>
          ) : paginatedWords.length === 0 ? (
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-xs font-bold text-slate-400">
              暂无匹配词汇，可切换筛选分类或调整搜索关键词。
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {paginatedWords.map((word) => {
                  const isExpanded = expandedId === word.id;
                  return (
                    <div
                      key={word.id}
                      data-tour="word-card"
                      onClick={() => setExpandedId(isExpanded ? null : word.id)}
                      className={cn(
                        "bg-white border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer",
                        isExpanded
                          ? "border-blue-300 shadow-sm ring-1 ring-blue-500/10"
                          : "border-slate-200 shadow-sm hover:border-slate-300",
                      )}
                    >
                      {/* Word row — always-visible actions */}
                      <div className="px-4 py-2.5 flex items-center justify-between select-none">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                            {word.spelling}
                          </h3>
                          {word.phonetic && (
                            <span className="text-xs font-bold font-mono text-slate-400 tracking-wide">
                              {word.phonetic}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Pronunciation — always visible */}
                          <button
                            onClick={(e) => handleSound(word.spelling, e)}
                            className={cn(
                              "p-1.5 rounded-xl border transition-all",
                              isExpanded
                                ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                                : "bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-100",
                            )}
                            title="发音"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Mastered toggle — always visible */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMastered(word);
                            }}
                            className={cn(
                              "p-1.5 rounded-xl border transition-all",
                              word.isMastered
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-50 text-slate-400 border-slate-200 hover:text-emerald-600 hover:bg-slate-100",
                            )}
                            title="标记掌握"
                          >
                            <CheckCircle
                              className={cn(
                                "w-3.5 h-3.5",
                                word.isMastered && "fill-emerald-600 text-white",
                              )}
                            />
                          </button>

                          {/* Starred toggle — always visible */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStarred(word);
                            }}
                            className={cn(
                              "p-1.5 rounded-xl border transition-all",
                              word.isStarred
                                ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                                : "bg-slate-50 text-slate-400 border-slate-200 hover:text-amber-500 hover:bg-slate-100",
                            )}
                            title="生词本关注"
                          >
                            <Star
                              className={cn(
                                "w-3.5 h-3.5",
                                word.isStarred && "fill-amber-500 text-amber-500",
                              )}
                            />
                          </button>

                          <div className="text-slate-400">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-2 border-t border-slate-100 bg-[#f8fafc]/50 space-y-2 select-text">
                          <div className="flex items-start gap-3">
                            {word.partOfSpeech && (
                              <span className="shrink-0 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                                {word.partOfSpeech}
                              </span>
                            )}
                            <p className="text-sm font-bold text-slate-700 leading-relaxed">
                              {word.definition}
                            </p>
                          </div>

                          {word.exampleSentences && word.exampleSentences.length > 0 && (
                            <div className="space-y-2 pl-1.5 border-l-2 border-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded">
                                  例句
                                </span>
                              </div>
                              {word.exampleSentences.map((ex, idx) => (
                                <div key={idx} className="space-y-0.5">
                                  <p className="text-sm font-medium text-slate-800 leading-relaxed">
                                    {idx + 1}. {ex.en}
                                  </p>
                                  {ex.cn && (
                                    <p className="text-xs text-slate-500 font-medium">
                                      {ex.cn}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && !isLoading && (
                <div className="flex items-center justify-center gap-4 pt-3 pb-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> 上一页
                  </button>

                  <span className="text-xs text-slate-400 font-medium">
                    第 {currentPage} / {totalPages} 页
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-all"
                  >
                    下一页 <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
