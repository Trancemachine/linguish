import { readFileSync, existsSync } from "fs";
import { join } from "path";

let _seedData: any = null;

export interface SeedDocument {
  file_name: string;
  words: Array<{ word: string; translation: string; example: string; importance?: number }>;
  chunks: Array<{ content: string; index: number; tokenCount: number }>;
}

export interface SeedData {
  version: number;
  generated_at: string;
  kb_name: string;
  documents: SeedDocument[];
}

export function getSeedData(): SeedData | null {
  if (_seedData) return _seedData;
  const seedPath = join(process.cwd(), ".seed", "kb-default.json");
  if (!existsSync(seedPath)) return null;
  try {
    _seedData = JSON.parse(readFileSync(seedPath, "utf-8"));
    return _seedData;
  } catch {
    return null;
  }
}

export const DEFAULT_KB_NAME = "默认英语学习知识库";

/** Get all words from all seed documents, deduplicated by spelling */
export function getSeedWords(): SeedDocument["words"] {
  const seed = getSeedData();
  if (!seed) return [];
  const seen = new Set<string>();
  const all: SeedDocument["words"] = [];
  for (const doc of seed.documents) {
    for (const w of doc.words) {
      const key = w.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        all.push(w);
      }
    }
  }
  return all;
}
