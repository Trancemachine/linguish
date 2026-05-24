import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_KB_NAME } from "@/lib/seed-data";

export async function applySeedForUser(userId: string): Promise<string | null> {
  const supabase = createAdminClient();

  // Check if already seeded
  const { data: existing } = await supabase
    .from("knowledge_bases")
    .select("id")
    .eq("user_id", userId)
    .eq("name", DEFAULT_KB_NAME)
    .maybeSingle();

  if (existing) return existing.id;

  // Read seed data
  const seedPath = join(process.cwd(), ".seed", "kb-default.json");
  if (!existsSync(seedPath)) return null;

  const seed = JSON.parse(readFileSync(seedPath, "utf-8"));

  // Create KB
  const { data: kb, error: kbError } = await supabase
    .from("knowledge_bases")
    .insert({ user_id: userId, name: seed.kb_name })
    .select()
    .single();

  if (kbError || !kb) return null;

  let totalWords = 0;

  for (const doc of seed.documents) {
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        knowledge_base_id: kb.id,
        file_name: doc.file_name,
        file_hash: `seed-${doc.file_name}`,
        file_path: `seed/${doc.file_name}`,
        status: "completed",
      })
      .select()
      .single();

    if (docError || !document) continue;

    if (doc.words?.length > 0) {
      const wordRows = doc.words.map((w: any) => ({
        knowledge_base_id: kb.id,
        document_id: document.id,
        spelling: w.word,
        definition: w.translation,
        example_sentence_en: w.example || null,
      }));

      const { data: inserted } = await supabase.from("words").insert(wordRows).select();
      totalWords += inserted?.length ?? 0;
    }

    if (doc.chunks?.length > 0) {
      const BATCH_SIZE = 20;
      for (let i = 0; i < doc.chunks.length; i += BATCH_SIZE) {
        const chunkRows = doc.chunks.slice(i, i + BATCH_SIZE).map((c: any) => ({
          document_id: document.id,
          knowledge_base_id: kb.id,
          chunk_index: c.index,
          content: c.content,
          token_count: c.tokenCount,
        }));
        await supabase.from("document_chunks").insert(chunkRows).catch(() => {});
      }
    }
  }

  await supabase.from("documents").update({ word_count: totalWords }).eq("knowledge_base_id", kb.id);

  return kb.id;
}
