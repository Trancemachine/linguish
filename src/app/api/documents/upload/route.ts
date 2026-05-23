import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { extractKeywords, isAiConfigured } from "@/lib/ai";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  hashFile,
  parseDocument,
} from "@/lib/document-parser";

export async function POST(request: NextRequest) {
  const user = await getUser();
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

  const supabase = await createClient();
  const admin = createAdminClient();

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

  const filePath = `${user.id}/${kbId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await admin.storage
    .from("documents")
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: `Storage 上传失败: ${uploadError.message}。请在 Supabase 创建 documents bucket。` },
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
    const text = await parseDocument(buffer, file.name);
    let words: { word: string; translation: string; example: string; importance: number }[] = [];

    if (isAiConfigured() && text.trim()) {
      const extracted = await extractKeywords(text);
      words = extracted.map((w, i) => ({
        word: w.word,
        translation: w.translation,
        example: w.example ?? "",
        importance: w.importance ?? 100 - i,
      }));
    }

    if (words.length > 0) {
      await supabase.from("word_lists").insert(
        words.map((w) => ({
          document_id: doc.id,
          knowledge_base_id: kbId,
          word: w.word,
          translation: w.translation,
          example: w.example,
          importance: w.importance,
        }))
      );
    }

    await supabase.from("documents").update({ status: "completed" }).eq("id", doc.id);

    return NextResponse.json({
      id: doc.id,
      status: "completed",
      word_count: words.length,
    });
  } catch (err) {
    await supabase.from("documents").update({ status: "failed" }).eq("id", doc.id);
    const message = err instanceof Error ? err.message : "解析失败";
    return NextResponse.json({ error: message, id: doc.id, status: "failed" }, { status: 500 });
  }
}
