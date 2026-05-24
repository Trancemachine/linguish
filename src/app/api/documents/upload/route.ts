import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRouteHandlerUser } from "@/lib/auth";
import { extractKeywords, isAiConfigured } from "@/lib/ai";
import { generateEmbedding } from "@/lib/embeddings";
import { chunkText } from "@/lib/chunking";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  hashFile,
  parseDocument,
} from "@/lib/document-parser";

function uuidV4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function POST(request: NextRequest) {
  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录后再上传文档" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const kbId = formData.get("knowledge_base_id") as string | null;

  if (!file || !kbId) {
    return NextResponse.json({ error: "缺少 file 或 knowledge_base_id" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({ error: `不支持的格式: .${ext}` }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "文件超过 10MB 限制" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = hashFile(buffer);

  const supabase = createAdminClient();

  const { data: kb } = await supabase
    .from("knowledge_bases")
    .select("id")
    .eq("id", kbId)
    .eq("user_id", user.id)
    .single();

  if (!kb) {
    return NextResponse.json({ error: "知识库不存在" }, { status: 404 });
  }

  const { data: existingDoc } = await supabase
    .from("documents")
    .select("id, status")
    .eq("file_hash", fileHash)
    .eq("knowledge_base_id", kbId)
    .maybeSingle();

  if (existingDoc) {
    return NextResponse.json({
      id: existingDoc.id,
      status: existingDoc.status,
      message: "文件已存在，复用解析结果",
    });
  }

  const safeName = `${uuidV4()}.${ext}`;
  const filePath = `${user.id}/${kbId}/${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: `Storage 上传失败: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      knowledge_base_id: kbId,
      file_name: file.name,
      file_hash: fileHash,
      file_path: filePath,
      status: "processing",
    })
    .select()
    .single();

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }

  try {
    // Step 1: Extract text from document
    const text = await parseDocument(buffer, file.name);
    let wordCount = 0;

    // Phase A: Extract words via LLM
    if (isAiConfigured() && text.trim()) {
      try {
        const extracted = await extractKeywords(text);

        if (extracted.length > 0) {
          const wordRows = extracted.map((w) => ({
            knowledge_base_id: kbId,
            document_id: doc.id,
            spelling: w.word,
            definition: w.translation,
            example_sentence_en: w.example || null,
          }));

          const { data: inserted } = await supabase
            .from("words")
            .insert(wordRows)
            .select();

          wordCount = inserted?.length ?? 0;
        }
      } catch {
        // AI extraction failed, fall through to fallback
      }
    }

    // Fallback: basic word extraction if AI returned 0 or wasn't available
    if (wordCount === 0 && text.trim()) {
      try {
        const rawWords = text.match(/\b[A-Za-z]{3,}\b/g) || [];
        const uniqueWords = [...new Set(rawWords.map((w) => w.toLowerCase()))];
        const stopWords = new Set([
          "the","and","for","are","but","not","you","all","can","had","her","was","one",
          "our","out","has","have","been","some","them","than","that","this","very","just",
          "also","more","with","from","they","what","when","where","which","will","your",
          "into","about","their","there","would","could","should","its","his","said",
          "each","than","then","these","those","over","such","while","after","before",
          "between","through","during","without","because","under","other","another",
          "many","much","both","most","first","last","upon","may","might","shall","being",
          "been","having","doing","does","did","done","making","made","take","took","taken",
          "come","came","give","gave","given","find","found","keep","kept","know","known",
        ]);
        const filtered = uniqueWords.filter((w) => !stopWords.has(w)).slice(0, 200);

        if (filtered.length > 0) {
          const fallbackRows = filtered.map((w) => ({
            knowledge_base_id: kbId,
            document_id: doc.id,
            spelling: w,
            definition: w,
            example_sentence_en: null,
          }));

          const { data: inserted } = await supabase
            .from("words")
            .insert(fallbackRows)
            .select();

          wordCount = inserted?.length ?? 0;
        }
      } catch {
        // Fallback extraction failed — don't block document completion
      }
    }

    // Phase B: Chunk + embed for RAG
    const chunks = chunkText(text);

    if (chunks.length > 0) {
      const chunkRows = [];
      for (const chunk of chunks) {
        const row: any = {
          document_id: doc.id,
          knowledge_base_id: kbId,
          chunk_index: chunk.index,
          content: chunk.content,
          token_count: chunk.tokenCount,
        };

        // Generate embedding for each chunk
        try {
          const embedding = await generateEmbedding(chunk.content);
          if (embedding) {
            row.embedding = embedding;
          }
        } catch {
          // Embedding optional; skip on failure
        }

        chunkRows.push(row);
      }

      // Insert in batches
      const BATCH_SIZE = 20;
      for (let i = 0; i < chunkRows.length; i += BATCH_SIZE) {
        try {
          await supabase.from("document_chunks").insert(chunkRows.slice(i, i + BATCH_SIZE));
        } catch {
          // document_chunks table may not exist yet; skip
        }
      }
    }

    // Update document status
    await supabase
      .from("documents")
      .update({ status: "completed", word_count: wordCount })
      .eq("id", doc.id);

    return NextResponse.json({
      id: doc.id,
      status: "completed",
      word_count: wordCount,
      chunk_count: chunks.length,
    });
  } catch (err) {
    await supabase.from("documents").update({ status: "failed" }).eq("id", doc.id);
    const message = err instanceof Error ? err.message : "解析失败";
    return NextResponse.json({ error: message, id: doc.id, status: "failed" }, { status: 500 });
  }
}
