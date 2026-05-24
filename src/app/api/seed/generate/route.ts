import { NextResponse } from "next/server";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { extractKeywords } from "@/lib/ai";
import { chunkText } from "@/lib/chunking";

const DOCS = [
  { file: "harness-engineering-book.pdf", textFile: "harness-engineering-book.txt" },
  { file: "DeepSeek_R1.pdf", textFile: "DeepSeek_R1.txt" },
];

export async function POST() {
  const seedDir = join(process.cwd(), ".seed");
  const results: any[] = [];

  for (const doc of DOCS) {
    const textPath = join(seedDir, doc.textFile);
    if (!existsSync(textPath)) {
      results.push({ file: doc.file, error: "Text file not found" });
      continue;
    }

    const text = readFileSync(textPath, "utf-8").trim();

    try {
      const words = text ? await extractKeywords(text) : [];
      const chunks = chunkText(text || " ");

      results.push({
        file_name: doc.file,
        text_length: text.length,
        word_count: words.length,
        chunk_count: chunks.length,
        words,
        chunks,
      });
    } catch (err: any) {
      results.push({ file: doc.file, error: err.message });
    }
  }

  if (!existsSync(seedDir)) mkdirSync(seedDir, { recursive: true });

  const seedData = {
    version: 1,
    generated_at: new Date().toISOString(),
    kb_name: "默认英语学习知识库",
    documents: results.filter((r) => !r.error).map((r) => ({
      file_name: r.file_name,
      words: r.words,
      chunks: r.chunks,
    })),
    errors: results.filter((r) => r.error).map((r) => ({ file: r.file, error: r.error })),
  };

  writeFileSync(join(seedDir, "kb-default.json"), JSON.stringify(seedData, null, 2), "utf-8");

  return NextResponse.json(seedData);
}
