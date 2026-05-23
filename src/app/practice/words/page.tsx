"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Star, Volume2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { KnowledgeBase, Word } from "@/lib/types";
import { DEMO_KB_ID, demoKnowledgeBases, demoWords } from "@/lib/demo-data";
import { cn, speakWord } from "@/lib/utils";

export default function WordsPracticePage() {
  const [bases, setBases] = useState<KnowledgeBase[]>(demoKnowledgeBases);
  const [selectedKb, setSelectedKb] = useState(DEMO_KB_ID);
  const [words, setWords] = useState<Word[]>(demoWords);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "review" | "wordbook">("all");
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/knowledge-bases")
      .then((r) => r.json())
      .then(setBases)
      .catch(() => setBases(demoKnowledgeBases));
  }, []);

  useEffect(() => {
    fetch(`/api/words?kb_id=${selectedKb}`)
      .then((r) => r.json())
      .then(setWords)
      .catch(() => setWords(demoWords.filter((w) => w.knowledge_base_id === selectedKb)));
  }, [selectedKb]);

  const currentKb = bases.find((b) => b.id === selectedKb);

  useEffect(() => {
    if (currentKb?.current_word_id && progressRef.current) {
      progressRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentKb?.current_word_id, words]);

  async function markProgress(wordId: string) {
    await fetch(`/api/knowledge-bases/${selectedKb}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_word_id: wordId }),
    });
    setBases((prev) =>
      prev.map((b) =>
        b.id === selectedKb ? { ...b, current_word_id: wordId } : b
      )
    );
  }

  async function addToWordBook(wordId: string) {
    await fetch("/api/word-book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word_id: wordId, source: "manual" }),
    });
  }

  return (
    <AppShell title="单词练习" subtitle="点击单词展开详情，支持发音与进度标记">
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: "今日新词", value: "24" },
          { label: "复习单词", value: "156" },
          { label: "已掌握", value: "1,482" },
          { label: "学习时长", value: "45m" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "review", "wordbook"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm",
                filter === f
                  ? "bg-primary-light text-primary"
                  : "bg-primary-muted text-muted"
              )}
            >
              {f === "all" ? "全部单词" : f === "review" ? "待复习" : "生词本"}
            </button>
          ))}
        </div>
        <select
          value={selectedKb}
          onChange={(e) => setSelectedKb(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {bases.map((kb) => (
            <option key={kb.id} value={kb.id}>
              {kb.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {words.map((word) => {
          const isExpanded = expandedId === word.id;
          const isProgress = currentKb?.current_word_id === word.id;
          return (
            <div
              key={word.id}
              ref={isProgress ? progressRef : undefined}
              className={cn(
                "rounded-lg border bg-card transition",
                isProgress ? "border-primary bg-primary-muted/30" : "border-border"
              )}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : word.id)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <span className="text-lg font-semibold text-primary">{word.word}</span>
                <span className="text-xs text-muted">重要度 {word.importance}</span>
              </button>
              {isExpanded && (
                <div className="animate-expand border-t border-border px-4 pb-4">
                  <p className="text-base font-medium">{word.translation}</p>
                  {word.example && (
                    <p className="mt-2 text-sm italic text-muted">{word.example}</p>
                  )}
                  <WordActions word={word} markProgress={markProgress} addToWordBook={addToWordBook} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function WordActions({
  word,
  markProgress,
  addToWordBook,
}: {
  word: Word;
  markProgress: (id: string) => void;
  addToWordBook: (id: string) => void;
}) {
  return (
    <div className="mt-3 flex gap-2">
      <button
        onClick={() => speakWord(word.word)}
        className="flex items-center gap-1 rounded-lg bg-primary-muted px-3 py-1.5 text-sm text-primary"
      >
        <Volume2 className="h-4 w-4" /> 发音
      </button>
      <button
        onClick={() => markProgress(word.id)}
        className="flex items-center gap-1 rounded-lg bg-primary-muted px-3 py-1.5 text-sm text-primary"
      >
        <Flag className="h-4 w-4" /> 标记进度
      </button>
      <button
        onClick={() => addToWordBook(word.id)}
        className="flex items-center gap-1 rounded-lg bg-primary-muted px-3 py-1.5 text-sm text-primary"
      >
        <Star className="h-4 w-4" /> 加入生词本
      </button>
    </div>
  );
}
