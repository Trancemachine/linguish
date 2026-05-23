export type DocumentStatus = "pending" | "processing" | "completed" | "failed";

export interface KnowledgeBase {
  id: string;
  name: string;
  current_word_id: string | null;
  created_at: string;
  documents?: Document[];
  document_count?: number;
}

export interface Document {
  id: string;
  knowledge_base_id: string;
  file_name: string;
  file_hash: string;
  status: DocumentStatus;
  created_at: string;
}

export interface Word {
  id: string;
  knowledge_base_id: string;
  word: string;
  translation: string;
  example: string | null;
  importance: number;
}

export interface WordBookEntry {
  id: string;
  word_id: string;
  source: "manual" | "wrong";
  word: Word;
}

export interface StatsSummary {
  today_words: number;
  today_dialogues: number;
  today_duration_minutes: number;
  month_words: number;
  month_dialogues: number;
  month_duration_minutes: number;
}

export interface DialogueMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}
