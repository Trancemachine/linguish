// Embedding API wrapper
// Uses OpenAI-compatible endpoint; falls back gracefully if unavailable

const EMBEDDING_MODEL = "text-embedding-ada-002";
const EMBEDDING_DIMENSIONS = 1536;

function getEmbeddingConfig() {
  const baseUrl = (process.env.EMBEDDING_BASE_URL || "https://api.openai.com").replace(/\/$/, "");
  const apiKey = process.env.EMBEDDING_API_KEY || process.env.ANTHROPIC_API_KEY || "";
  return { baseUrl, apiKey };
}

export function isEmbeddingConfigured() {
  const { apiKey } = getEmbeddingConfig();
  return Boolean(apiKey && !apiKey.includes("your-") && !apiKey.includes("sk-ba0eff"));
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!isEmbeddingConfigured()) return null;

  const { baseUrl, apiKey } = getEmbeddingConfig();

  try {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

export async function generateEmbeddings(batch: string[]): Promise<(number[] | null)[]> {
  return Promise.all(batch.map(generateEmbedding));
}
