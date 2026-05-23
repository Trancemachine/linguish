import { NextRequest, NextResponse } from "next/server";
import { translateText, isAiConfigured } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  if (!text) {
    return NextResponse.json({ error: "缺少 text" }, { status: 400 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json({ translation: "（请配置 API Key 后启用翻译）" });
  }

  try {
    const translation = await translateText(text);
    return NextResponse.json({ translation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "翻译失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
