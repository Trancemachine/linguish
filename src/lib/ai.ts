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
  stream: boolean
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
      max_tokens: 2048,
      system,
      messages: chatMessages,
      stream,
    }),
  });
}

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const res = await apiRequest(messages, false);

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
  const snippet = text.slice(0, 8000);
  const raw = await chatCompletion([
    {
      role: "system",
      content:
        "You extract English vocabulary from academic text. Return ONLY valid JSON array: [{\"word\":\"...\",\"translation\":\"中文\",\"example\":\"English sentence\",\"importance\":90}]. importance is 1-100. Max 30 items.",
    },
    { role: "user", content: snippet },
  ]);

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]) as ExtractedWord[];
    return parsed.filter((w) => w.word && w.translation);
  } catch {
    return [];
  }
}

export async function translateText(text: string): Promise<string> {
  return chatCompletion([
    {
      role: "system",
      content: "Translate the following English text to Chinese. Return translation only.",
    },
    { role: "user", content: text },
  ]);
}
