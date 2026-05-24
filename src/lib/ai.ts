export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ExtractedWord {
  word: string;
  translation: string;
  example: string;
  importance?: number;
}

function getConfig() {
  const baseUrl = (process.env.ANTHROPIC_BASE_URL ?? "https://api.deepseek.com/anthropic").trim().replace(/\/$/, "");
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  return { baseUrl, apiKey };
}

export function isAiConfigured() {
  const { apiKey } = getConfig();
  return Boolean(apiKey && !apiKey.includes("your-"));
}

async function apiRequest(
  messages: ChatMessage[],
  stream: boolean,
  maxTokens: number = 2048
): Promise<Response> {
  const { baseUrl, apiKey } = getConfig();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const system = messages.find((m) => m.role === "system")?.content;
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  return fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      max_tokens: maxTokens,
      system,
      messages: chatMessages,
      stream,
    }),
  });
}

export async function chatCompletion(messages: ChatMessage[], maxTokens?: number): Promise<string> {
  const res = await apiRequest(messages, false, maxTokens);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI request failed: ${err}`);
  }

  const data = await res.json();
  const block = data.content?.[0];
  return block?.text ?? data.content ?? "No response";
}

export async function* chatCompletionStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const res = await apiRequest(messages, true);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI request failed: ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        const delta =
          parsed.delta?.text ??
          parsed.type === "content_block_delta"
            ? parsed.delta?.text
            : undefined;
        if (delta) yield delta;
      } catch {
        // skip malformed JSON lines
      }
    }
  }
}

export async function extractKeywords(text: string): Promise<ExtractedWord[]> {
  // Split text into chunks of ~25000 chars for full document coverage
  const CHUNK_SIZE = 25000;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }

  const allWords: ExtractedWord[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    try {
      const raw = await chatCompletion([
        {
          role: "system",
          content:
            "You extract English vocabulary from academic text. Return ONLY valid JSON array: [{\"word\":\"...\",\"translation\":\"中文\",\"example\":\"English sentence\",\"importance\":90}]. importance is 1-100. Max 50 items. Focus on important academic/professional terms.",
        },
        { role: "user", content: chunk },
      ], 4096);

      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) continue;

      const parsed = JSON.parse(match[0]) as ExtractedWord[];
      for (const w of parsed) {
        if (w.word && w.translation && !seen.has(w.word.toLowerCase())) {
          seen.add(w.word.toLowerCase());
          allWords.push(w);
        }
      }
    } catch {
      // Skip failed chunks
    }

    // Safety limit: max 500 words total
    if (allWords.length >= 500) break;
  }

  return allWords;
}

export async function translateText(text: string): Promise<string> {
  return chatCompletion([
    {
      role: "system",
      content: "You are a translator. Translate the following English text to Chinese. Rules: (1) Return ONLY the Chinese translation, nothing else. (2) Use ONLY plain text. (3) NEVER use asterisks, backticks, hashes, or any formatting symbols. (4) If the input is already Chinese, return it as-is.",
    },
    { role: "user", content: text },
  ]);
}
