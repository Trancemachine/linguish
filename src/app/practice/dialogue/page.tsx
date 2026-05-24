"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { Languages, Mic, Send, Square, Volume2, VolumeX, ChevronDown, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { DialogueMessage } from "@/lib/types";
import { cn, speakText } from "@/lib/utils";

interface KbItem {
  id: string;
  name: string;
  totalWords: number;
}

const initialMessages: DialogueMessage[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hello! I'm your AI interview coach. Let's practice a job interview scenario. Tell me about your research background.",
  },
];

export default function DialoguePage() {
  const [messages, setMessages] = useState<DialogueMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [muted, setMuted] = useState(false);
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>([]);
  const [kbDropdownOpen, setKbDropdownOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevStreamingRef = useRef<string | null>(null);
  const loadedRef = useRef(false);
  const savedIdsRef = useRef<Set<string>>(new Set());

  // Load existing conversation from server on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetch("/api/dialogue/records")
      .then((r) => r.json())
      .then((data: { messages: DialogueMessage[] }) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
          data.messages.forEach((m) => savedIdsRef.current.add(m.id));
        } else {
          // No saved conversation — keep initial message, mark as saved so it isn't persisted
          savedIdsRef.current.add("1");
        }
      })
      .catch(() => {});
  }, []);

  // Save all unsaved messages after streaming completes (sequentially to preserve order)
  useEffect(() => {
    if (prevStreamingRef.current && !streamingId) {
      const unsaved = messages.filter((m) => !savedIdsRef.current.has(m.id));
      if (unsaved.length === 0) return;
      (async () => {
        for (const msg of unsaved) {
          try {
            const res = await fetch("/api/dialogue/records", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: msg.role, content: msg.content }),
            });
            if (res.ok) savedIdsRef.current.add(msg.id);
          } catch {}
        }
      })();
    }
  }, [streamingId, messages]);

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

  // Auto-play TTS when streaming completes
  useEffect(() => {
    const prev = prevStreamingRef.current;
    prevStreamingRef.current = streamingId;

    // streaming just ended (was streaming, now not)
    if (prev && !streamingId && !muted) {
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === "assistant" && m.content);
      if (lastAssistant && lastAssistant.content) {
        speakText(lastAssistant.content);
      }
    }
  }, [streamingId, messages, muted]);

  async function toggleTranslation(msgId: string, text: string) {
    if (translations[msgId]) {
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
      return;
    }
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setTranslations((prev) => ({ ...prev, [msgId]: data.translation ?? data.error }));
  }

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg: DialogueMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setStreamingId(assistantId);
    setInput("");
    setLoading(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const res = await fetch("/api/dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          stream: true,
          knowledge_base_ids: selectedKbIds.length > 0 ? selectedKbIds : undefined,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: data.content ?? "Request failed." } : m
          )
        );
        setStreamingId(null);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + text } : m))
        );
        scrollToBottom();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "Connection error. Please try again." } : m
        )
      );
    } finally {
      setStreamingId(null);
      setLoading(false);
      abortRef.current = null;
      scrollToBottom();
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  function toggleKb(kbId: string) {
    setSelectedKbIds((prev) =>
      prev.includes(kbId) ? prev.filter((id) => id !== kbId) : [...prev, kbId],
    );
  }

  function clearConversation() {
    if (messages.length <= 1) return;
    setMessages(initialMessages);
    setTranslations({});
    savedIdsRef.current.clear();
    savedIdsRef.current.add("1");
    window.speechSynthesis?.cancel();
    fetch("/api/dialogue/records", { method: "DELETE" }).catch(() => {});
  }

  const displayLabel =
    selectedKbIds.length === 0
      ? "知识库"
      : selectedKbIds.length === 1
        ? bases.find((b) => b.id === selectedKbIds[0])?.name ?? "已选择 1 个"
        : `已选 ${selectedKbIds.length} 个`;

  return (
    <AppShell title="场景对话练习" subtitle="AI 面试官 · 支持流式输出与语音输入">
      <div className="relative flex h-[calc(100vh-12rem)] flex-col rounded-xl border border-border bg-card">
        {/* Floating KB selector — top-left */}
        <div className="absolute left-3 top-3 z-10">
          <div className="relative">
            <button
              onClick={() => setKbDropdownOpen(!kbDropdownOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur hover:border-slate-300 transition-colors"
            >
              <span className="truncate max-w-[100px]">{displayLabel}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {kbDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setKbDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-64 overflow-y-auto p-2.5 space-y-1">
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
        </div>

        {/* Top-right: clear + mute */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          <button
            onClick={clearConversation}
            className="rounded-xl border border-slate-200 bg-white/95 p-2 text-slate-500 shadow-sm backdrop-blur hover:text-red-500 transition-colors"
            title="清除对话"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMuted(!muted)}
            className="rounded-xl border border-slate-200 bg-white/95 p-2 text-slate-500 shadow-sm backdrop-blur hover:text-slate-700 transition-colors"
            title={muted ? "开启语音" : "关闭语音"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6 pt-14">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-primary-muted text-foreground"
                )}
              >
                {msg.role === "assistant" && msg.id === streamingId ? (
                  <>
                    {msg.content}
                    <span className="inline-block h-4 w-2 animate-pulse bg-primary ml-0.5 rounded-sm" />
                  </>
                ) : (
                  msg.content || (msg.role === "assistant" ? "" : "")
                )}
                {msg.role === "assistant" && msg.content && !(msg.id === streamingId) && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!muted) speakText(msg.content);
                      }}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                      title="播放语音"
                    >
                      <Volume2 className="h-3 w-3" />
                      朗读
                    </button>
                    <button
                      onClick={() => toggleTranslation(msg.id, msg.content)}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                    >
                      <Languages className="h-3 w-3" />
                      {translations[msg.id] ? "隐藏翻译" : "翻译"}
                    </button>
                  </div>
                )}
                {translations[msg.id] && msg.role === "assistant" && (
                  <p className="mt-2 border-t border-border pt-2 text-xs text-muted">
                    {translations[msg.id]}
                  </p>
                )}
              </div>
            </div>
          ))}
          {loading && !streamingId && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-primary-muted px-4 py-3 text-sm text-muted">
                正在输入...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <VoiceInputButton
              loading={loading}
              onResult={(text) => setInput((prev) => prev + text)}
              onSend={sendMessage}
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="输入你的回答..."
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            {loading ? (
              <button
                onClick={stopStreaming}
                className="rounded-lg bg-red-500 p-2.5 text-white"
              >
                <Square className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={loading}
                className="rounded-lg bg-primary p-2.5 text-white disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function VoiceInputButton({
  loading,
  onResult,
  onSend,
}: {
  loading: boolean;
  onResult: (text: string) => void;
  onSend?: () => void;
}) {
  const [listening, setListening] = useState(false);
  const gotResultRef = useRef(false);

  function startListening() {
    const w = window as unknown as Record<string, unknown>;
    const SpeechRecognitionCtor: unknown =
      w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert("您的浏览器不支持语音输入，请使用 Chrome 或 Safari。");
      return;
    }

    gotResultRef.current = false;

    const recognition: Record<string, unknown> = new (SpeechRecognitionCtor as new () => Record<string, unknown>)();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: unknown) => {
      const e = event as { results: Array<Array<{ transcript: string }>> };
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
      gotResultRef.current = true;
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
      gotResultRef.current = false;
    };

    recognition.onend = () => {
      setListening(false);
      if (gotResultRef.current && onSend) {
        setTimeout(onSend, 100);
      }
      gotResultRef.current = false;
    };

    setListening(true);
    (recognition.start as () => void)();
  }

  return (
    <button
      onClick={startListening}
      disabled={loading}
      className={cn(
        "rounded-lg border p-2.5 transition-colors",
        listening
          ? "border-red-400 bg-red-50 text-red-500"
          : "border-border text-muted hover:text-primary"
      )}
    >
      <Mic className={cn("h-5 w-5", listening && "animate-pulse")} />
    </button>
  );
}
