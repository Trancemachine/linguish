// Text chunking strategy for RAG pipeline

interface Chunk {
  content: string;
  index: number;
  tokenCount: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const MAX_CHUNK_TOKENS = 800;

export function chunkText(text: string): Chunk[] {
  const normalized = text.replace(/\r\n/g, "\n");

  const paragraphs = normalized.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  const chunks: Chunk[] = [];
  let index = 0;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    const tokenEstimate = estimateTokens(trimmed);

    if (tokenEstimate <= MAX_CHUNK_TOKENS) {
      chunks.push({ content: trimmed, index: index++, tokenCount: tokenEstimate });
    } else {
      const sentences = trimmed.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
      let buffer = "";

      for (const sentence of sentences) {
        const combined = buffer ? buffer + " " + sentence : sentence;
        if (estimateTokens(combined) > MAX_CHUNK_TOKENS && buffer) {
          chunks.push({ content: buffer, index: index++, tokenCount: estimateTokens(buffer) });
          buffer = sentence;
        } else {
          buffer = combined;
        }
      }

      if (buffer) {
        chunks.push({ content: buffer, index: index++, tokenCount: estimateTokens(buffer) });
      }
    }
  }

  if (chunks.length === 0) {
    chunks.push({ content: text, index: 0, tokenCount: estimateTokens(text) });
  }

  return chunks;
}
