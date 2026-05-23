"use client";

import { useCallback, useRef, useState } from "react";
import { Languages, Mic, Send, Square } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { DialogueMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      const allPrev = messages.filter((m) => m.id !== "1" || true);
      const res = await fetch("/api/dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          stream: true,
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

  return (
    <AppShell title="场景对话练习" subtitle="AI 面试官 · 支持流式输出与语音输入">
      <div className="flex h-[calc(100vh-12rem)] flex-col rounded-xl border border-border bg-card">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
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
                  <button
                    onClick={() => toggleTranslation(msg.id, msg.content)}
                    className="mt-2 flex items-center gap-1 text-xs text-primary"
                  >
                    <Languages className="h-3 w-3" />
                    {translations[msg.id] ? "隐藏翻译" : "翻译"}
                  </button>
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
}: {
  loading: boolean;
  onResult: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);

  function startListening() {
    const w = window as unknown as Record<string, unknown>;
    const SpeechRecognitionCtor: unknown =
      w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert("您的浏览器不支持语音输入，请使用 Chrome 或 Safari。");
      return;
    }

    const recognition: Record<string, unknown> = new (SpeechRecognitionCtor as new () => Record<string, unknown>)();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: unknown) => {
      const e = event as { results: Array<Array<{ transcript: string }>> };
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

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
