# Linguish 项目搭建指南

## 环境变量

已配置 `.env.local`，包含 Supabase 和 DeepSeek（Anthropic 兼容接口）。

如需重新配置：

```bash
cp .env.example .env.local
```

## 本地启动

```bash
cd linguish
npm install
npm run dev
```

## Supabase 初始化（如尚未完成）

1. 进入 [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. 执行 `supabase/schema.sql` 建表
3. 进入 **Storage** → 创建 bucket：`documents`（Private）
4. 进入 **Authentication** → 确认 Email 登录已启用

## 功能状态

| 模块 | 状态 |
|------|------|
| 登录/注册 + 游客模式 | ✅ |
| 知识库 CRUD + 文档上传 | ✅（需登录 + Storage bucket） |
| 单词练习（展开/发音/进度/生词本） | ✅ |
| AI 对话 + 翻译 | ✅（Anthropic 兼容 DeepSeek API） |
| 图片 OCR (tesseract) | ⏳ 未启用 |
| 对话流式输出 | ⏳ 待优化 |
| 语音输入 | ⏳ UI 占位 |
| Vercel 部署 | ⏳ M7 阶段 |

## 注意事项

- 上传文档需先登录（`/auth`）
- API Key 已写入 `.env.local`，请勿提交到 Git
- 构建命令：`npm run build`（使用 Webpack）
