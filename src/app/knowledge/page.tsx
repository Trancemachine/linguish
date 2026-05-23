"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { Document, KnowledgeBase } from "@/lib/types";
import { demoKnowledgeBases } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  pending: "待处理",
  processing: "解析中",
  completed: "已完成",
  failed: "失败",
};

export default function KnowledgePage() {
  const [bases, setBases] = useState<KnowledgeBase[]>(demoKnowledgeBases);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadBases = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge-bases");
      const data = await res.json();
      setBases(Array.isArray(data) ? data : demoKnowledgeBases);
    } catch {
      setBases(demoKnowledgeBases);
    }
  }, []);

  useEffect(() => {
    loadBases();
  }, [loadBases]);

  async function addBase() {
    if (!newName.trim()) return;
    const res = await fetch("/api/knowledge-bases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      await loadBases();
    } else {
      const kb: KnowledgeBase = {
        id: `kb-${Date.now()}`,
        name: newName.trim(),
        current_word_id: null,
        created_at: new Date().toISOString(),
        document_count: 0,
        documents: [],
      };
      setBases((prev) => [...prev, kb]);
      setNewName("");
      setExpanded(kb.id);
    }
  }

  async function deleteBase(id: string) {
    await fetch(`/api/knowledge-bases?id=${id}`, { method: "DELETE" });
    setBases((prev) => prev.filter((b) => b.id !== id));
  }

  async function handleUpload(kbId: string, files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("knowledge_base_id", kbId);
        const res = await fetch("/api/documents/upload", { method: "POST", body: form });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error ?? "上传失败");
        }
      }
      await loadBases();
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppShell title="知识库" subtitle="管理你的学习语料，上传文档自动提取词汇">
      <div className="mb-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新知识库名称"
          className="flex-1 rounded-lg border border-border px-4 py-2 text-sm outline-none focus:border-primary"
          onKeyDown={(e) => e.key === "Enter" && addBase()}
        />
        <button
          onClick={addBase}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white"
        >
          <Plus className="h-4 w-4" />
          新建
        </button>
      </div>

      <div className="space-y-3">
        {bases.map((kb) => (
          <div key={kb.id} className="rounded-xl border border-border bg-card">
            <KbHeader
              kb={kb}
              expanded={expanded}
              setExpanded={setExpanded}
              deleteBase={deleteBase}
            />
            {expanded === kb.id && (
              <div className="border-t border-border px-5 py-4">
                <DocumentList documents={kb.documents} />
                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-primary-muted/50 py-8 transition hover:border-primary">
                  {uploading ? (
                    <Loader2 className="mb-2 h-6 w-6 animate-spin text-primary" />
                  ) : (
                    <Upload className="mb-2 h-6 w-6 text-primary" />
                  )}
                  <span className="text-sm text-muted">
                    {uploading ? "上传解析中..." : "拖拽或点击上传文档"}
                  </span>
                  <span className="mt-1 text-xs text-muted">
                    支持 txt / pdf / docx / png / jpg，单文件 10MB（需登录）
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept=".txt,.pdf,.docx,.png,.jpg,.jpeg"
                    disabled={uploading}
                    onChange={(e) => handleUpload(kb.id, e.target.files)}
                  />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function KbHeader({
  kb,
  expanded,
  setExpanded,
  deleteBase,
}: {
  kb: KnowledgeBase;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  deleteBase: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <button
        onClick={() => setExpanded(expanded === kb.id ? null : kb.id)}
        className="flex flex-1 items-center gap-3 text-left"
      >
        {expanded === kb.id ? (
          <ChevronDown className="h-5 w-5 text-primary" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted" />
        )}
        <div>
          <p className="font-medium">{kb.name}</p>
          <p className="text-sm text-muted">
            {kb.document_count ?? kb.documents?.length ?? 0} 个文档
          </p>
        </div>
      </button>
      <button
        onClick={() => deleteBase(kb.id)}
        className="rounded p-2 text-muted hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DocumentList({ documents }: { documents?: Document[] }) {
  if (!documents?.length) {
    return <p className="text-sm text-muted">暂无文档，请上传文件</p>;
  }
  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
        >
          <DocNameRow fileName={doc.file_name} />
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              doc.status === "completed" && "bg-green-50 text-green-600",
              doc.status === "pending" && "bg-amber-50 text-amber-600",
              doc.status === "processing" && "bg-blue-50 text-blue-600",
              doc.status === "failed" && "bg-red-50 text-red-600"
            )}
          >
            {statusLabel[doc.status] ?? doc.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function DocNameRow({ fileName }: { fileName: string }) {
  return (
    <div className="flex items-center gap-3">
      <FileText className="h-4 w-4 text-primary" />
      <span className="text-sm">{fileName}</span>
    </div>
  );
}
