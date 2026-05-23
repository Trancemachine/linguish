-- Linguish 数据库 Schema
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本

-- 知识库表
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  current_word_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 文档表
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 词汇表
CREATE TABLE IF NOT EXISTS word_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  example TEXT,
  importance INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE knowledge_bases
  ADD CONSTRAINT fk_current_word
  FOREIGN KEY (current_word_id) REFERENCES word_lists(id) ON DELETE SET NULL;

-- 生词本表
CREATE TABLE IF NOT EXISTS word_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES word_lists(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'wrong')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, word_id)
);

-- 练习会话
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('words', 'dialogue')),
  duration_seconds INT DEFAULT 0,
  word_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 对话记录
CREATE TABLE IF NOT EXISTS dialogue_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 策略
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialogue_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own knowledge_bases" ON knowledge_bases
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own documents" ON documents
  FOR ALL USING (
  knowledge_base_id IN (SELECT id FROM knowledge_bases WHERE user_id = auth.uid())
);

CREATE POLICY "Users read own word_lists" ON word_lists
  FOR ALL USING (
  knowledge_base_id IN (SELECT id FROM knowledge_bases WHERE user_id = auth.uid())
);

CREATE POLICY "Users manage own word_book" ON word_book
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own practice_sessions" ON practice_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own dialogue_records" ON dialogue_records
  FOR ALL USING (auth.uid() = user_id);

-- Storage bucket (在 Supabase Dashboard → Storage 创建 bucket: documents)
-- 设置为 private，允许 authenticated 用户上传
