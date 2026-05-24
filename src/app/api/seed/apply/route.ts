import { NextResponse } from "next/server";
import { getRouteHandlerUser } from "@/lib/auth";
import { applySeedForUser } from "@/lib/seed-applier";

export async function POST() {
  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const kbId = await applySeedForUser(user.id);

  if (!kbId) {
    return NextResponse.json({ error: "种子数据未生成或创建失败" }, { status: 500 });
  }

  return NextResponse.json({ kb_id: kbId, message: "默认知识库已创建" });
}
