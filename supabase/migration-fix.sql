-- Linguish 数据库迁移补充脚本
-- 在 Supabase Dashboard → SQL Editor 中执行
-- 创建代码依赖但数据库中缺失的表

-- 1. 向量扩展（用于文档块嵌入）
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. words 表
CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  spelling VARCHAR(200) NOT NULL,
  phonetic VARCHAR(200),
  part_of_speech VARCHAR(50),
  definition TEXT NOT NULL,
  example_sentence_en TEXT,
  example_sentence_cn TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_words_kb_id ON words(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_words_doc_id ON words(document_id);
CREATE INDEX IF NOT EXISTS idx_words_spelling ON words(spelling);

ALTER TABLE words ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own words" ON words
    FOR ALL USING (
      knowledge_base_id IN (SELECT id FROM knowledge_bases WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. document_chunks 表（RAG 文档块）
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  embedding VECTOR(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_kb_id ON document_chunks(knowledge_base_id);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own chunks" ON document_chunks
    FOR ALL USING (
      knowledge_base_id IN (SELECT id FROM knowledge_bases WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. user_word_status 表（单词学习状态追踪）
DO $$ BEGIN
  CREATE TYPE word_status AS ENUM ('none', 'starred', 'mastered');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_word_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  STATUS word_status NOT NULL DEFAULT 'none',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_uws_user_id ON user_word_status(user_id);
CREATE INDEX IF NOT EXISTS idx_uws_word_id ON user_word_status(word_id);
CREATE INDEX IF NOT EXISTS idx_uws_status ON user_word_status(status);

ALTER TABLE user_word_status ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own word_status" ON user_word_status
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. study_sessions 表（学习会话统计）
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module VARCHAR(20) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ss_user_date ON study_sessions(user_id, started_at);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own study_sessions" ON study_sessions
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. 补充 documents 表缺失的列
ALTER TABLE documents ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
