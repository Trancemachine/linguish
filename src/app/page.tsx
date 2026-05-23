"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookMarked, MessageSquare, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { StatsSummary, WordBookEntry } from "@/lib/types";
import { demoStats, demoWordBook } from "@/lib/demo-data";

export default function DashboardPage() {
  const [period, setPeriod] = useState<"today" | "month">("today");
  const [stats, setStats] = useState<StatsSummary>(demoStats);
  const [wordBook, setWordBook] = useState<WordBookEntry[]>(demoWordBook);

  useEffect(() => {
    fetch("/api/stats/summary")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(demoStats));
    fetch("/api/stats/word-book")
      .then((r) => r.json())
      .then(setWordBook)
      .catch(() => setWordBook(demoWordBook));
  }, []);

  const cards = [
    {
      label: "今日单词",
      value: period === "today" ? stats.today_words : stats.month_words,
      hint: period === "today" ? "+12% vs 昨天" : "近 30 天累计",
      color: "text-primary",
    },
    {
      label: "对话轮次",
      value: period === "today" ? stats.today_dialogues : stats.month_dialogues,
      hint: period === "today" ? "目标 10 轮" : "近 30 天累计",
      color: "text-accent-orange",
    },
    {
      label: "学习时长",
      value: `${period === "today" ? stats.today_duration_minutes : stats.month_duration_minutes}m`,
      hint: period === "today" ? "今日累计" : "近 30 天累计",
      color: "text-accent-green",
    },
  ];

  return (
    <AppShell title="首页" subtitle="欢迎回来，今日的学习进度已经过半。">
      <div className="mb-6 flex gap-2">
        {(["today", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              period === p
                ? "bg-primary-light text-primary"
                : "bg-primary-muted text-muted"
            }`}
          >
            {p === "today" ? "今日" : "近一月"}
          </button>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-xs text-primary">{card.hint}</span>
            </div>
            <p className="text-sm text-muted">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <QuickActions />

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BookMarked className="h-5 w-5 text-primary" />
            生词本
          </h2>
          <Link
            href="/practice/words?filter=wordbook"
            className="text-sm text-primary hover:underline"
          >
            开始练习
          </Link>
        </div>
        {wordBook.length === 0 ? (
          <p className="text-sm text-muted">暂无生词，在单词练习中点击 ⭐ 添加</p>
        ) : (
          <div className="space-y-2">
            {wordBook.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <span className="font-medium text-primary">{entry.word.word}</span>
                  <span className="ml-3 text-sm text-muted">
                    {entry.word.translation}
                  </span>
                </div>
                <span className="text-xs text-muted">
                  {entry.source === "manual" ? "手动标记" : "练习错词"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function QuickActions() {
  return (
    <div className="mb-8 grid grid-cols-2 gap-4">
      <Link
        href="/practice/words"
        className="group flex items-center justify-between rounded-xl border border-border bg-card p-6 transition hover:border-primary"
      >
        <div>
          <p className="text-lg font-semibold">开始单词练习</p>
          <p className="mt-1 text-sm text-muted">浏览词汇，点击展开详情</p>
        </div>
        <ArrowRight className="h-5 w-5 text-primary transition group-hover:translate-x-1" />
      </Link>
      <Link
        href="/practice/dialogue"
        className="group flex items-center justify-between rounded-xl border border-border bg-card p-6 transition hover:border-primary"
      >
        <div>
          <p className="text-lg font-semibold">开始对话练习</p>
          <p className="mt-1 text-sm text-muted">AI 面试官模拟场景对话</p>
        </div>
        <MessageSquare className="h-5 w-5 text-primary" />
      </Link>
    </div>
  );
}
