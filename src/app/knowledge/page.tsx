"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import {
  Plus,
  Search,
  BookOpen,
  Folder,
  FolderOpen,
  FileText,
  UploadCloud,
  Trash2,
  ExternalLink,
  CheckCircle,
  Loader2,
  ArrowUpDown,
  Pencil,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

// Local types matching linguist pra structure
interface KBFolder {
  id: string;
  name: string;
  docCount: number;
  isSystem: boolean;
}

interface KBDocument {
  id: string;
  name: string;
  status: "processing" | "completed" | "failed";
  progress?: number;
  wordCount: number;
  uploadDate: string;
}

export default function KnowledgePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<KBFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [docsMap, setDocsMap] = useState<Record<string, KBDocument[]>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [searchDocValue, setSearchDocValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const isCreatingRef = useRef(false);

  // SWR: auto-fetch and cache knowledge bases globally
  const { data, mutate, error } = useSWR("/api/knowledge-bases", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  // Sync SWR data to local state
  useEffect(() => {
    if (!data && !error) return;

    if (!Array.isArray(data) || data.length === 0) {
      setIsLoading(false);
      return;
    }

    const kbFolders: KBFolder[] = data.map((kb: any) => ({
      id: kb.id,
      name: kb.name,
      docCount: kb.totalWords ?? 0,
      isSystem: kb.isSystem === true,
    }));
    const kbDocsMap: Record<string, KBDocument[]> = {};
    for (const kb of data) {
      kbDocsMap[kb.id] = (kb.documents ?? []).map((doc: any) => ({
        id: doc.id,
        name: doc.file_name ?? "未知文件",
        status: doc.status ?? "completed",
        wordCount: doc.wordCount ?? 0,
        uploadDate: doc.created_at ? doc.created_at.split("T")[0] : "",
      }));
    }
    setFolders(kbFolders);
    setDocsMap(kbDocsMap);
    if (kbFolders.length > 0 && selectedFolderId === "") {
      setSelectedFolderId(kbFolders[0].id);
    }
    setIsLoading(false);
  }, [data, error]);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) || folders[0] || { id: "", name: "" };
  const folderDocs = docsMap[selectedFolderId] || [];

  // Filter documents based on search keyword
  const filteredDocs = folderDocs.filter((doc) =>
    doc.name.toLowerCase().includes(searchDocValue.toLowerCase())
  );

  const handleCreateFolderClick = () => {
    setNewFolderName("");
    setShowCreateModal(true);
  };

  const handleConfirmCreateFolder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = newFolderName.trim();
    if (!trimmedName || isCreating || isCreatingRef.current) return;
    setIsCreating(true);
    isCreatingRef.current = true;

    fetch("/api/knowledge-bases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data.error) {
          if (data.error === "请先登录") {
            setIsCreating(false); isCreatingRef.current = false;
            router.push("/auth");
          } else {
            setIsCreating(false); isCreatingRef.current = false;
            alert(data.error || "创建失败，请重试");
          }
          return null;
        }
        return data;
      })
      .then((data) => {
        if (!data?.id) return;
        const newFolder: KBFolder = { id: data.id, name: data.name, docCount: 0, isSystem: false };
        setFolders((prev) => [...prev, newFolder]);
        setDocsMap((prev) => ({ ...prev, [data.id]: [] }));
        setSelectedFolderId(data.id);
        setShowCreateModal(false);
        setIsCreating(false); isCreatingRef.current = false;
      })
      .catch(() => { setIsCreating(false); isCreatingRef.current = false; alert("创建失败，请检查网络连接"); });
  };

  const handleUploadFile = (file: File) => {
    if (!file || !selectedFolderId) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("knowledge_base_id", selectedFolderId);

    // Optimistic UI update
    const newDocId = `d_${Date.now()}`;
    const newDoc: KBDocument = {
      id: newDocId,
      name: file.name,
      status: "processing",
      progress: 0,
      wordCount: 0,
      uploadDate: new Date().toISOString().split("T")[0],
    };
    setDocsMap((prev) => ({
      ...prev,
      [selectedFolderId]: [newDoc, ...(prev[selectedFolderId] || [])],
    }));
    setFolders((prev) =>
      prev.map((f) => (f.id === selectedFolderId ? { ...f, docCount: f.docCount + 1 } : f))
    );

    fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(data.error || `上传失败 (${r.status})`);
        }
        return data;
      })
      .then((data) => {
        setDocsMap((prev) => ({
          ...prev,
          [selectedFolderId]: (prev[selectedFolderId] || []).map((doc) =>
            doc.id === newDocId
              ? { ...doc, status: data.status ?? "completed", wordCount: data.word_count ?? 0, progress: undefined }
              : doc
          ),
        }));
        // Re-fetch from DB to get authoritative word counts
        mutate();
      })
      .catch((err) => {
        setDocsMap((prev) => ({
          ...prev,
          [selectedFolderId]: (prev[selectedFolderId] || []).map((doc) =>
            doc.id === newDocId ? { ...doc, status: "failed", progress: undefined } : doc
          ),
        }));
        alert(err.message || "上传失败，请检查网络连接");
      });
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        handleUploadFile(files[i]);
      }
    }
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!confirm(`确定要彻底删除该知识库吗？其中的 ${(docsMap[folderId] || []).length} 个文档也将被一并删除，此操作不可恢复。`))
      return;

    // Save previous state for rollback
    const prevFolders = folders;
    const prevDocsMap = { ...docsMap };
    const prevSelected = selectedFolderId;

    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setDocsMap((prev) => {
      const next = { ...prev };
      delete next[folderId];
      return next;
    });

    if (selectedFolderId === folderId) {
      const remaining = folders.filter((f) => f.id !== folderId);
      setSelectedFolderId(remaining.length > 0 ? remaining[0].id : "");
    }

    fetch(`/api/knowledge-bases/${folderId}`, {
      method: "DELETE",
    }).then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
      mutate();
    }).catch(() => {
      // Rollback on failure
      setFolders(prevFolders);
      setDocsMap(prevDocsMap);
      setSelectedFolderId(prevSelected);
      alert("删除失败，请重试");
    });
  };

  const handleDocDelete = (docId: string) => {
    if (!confirm("确定要彻底删除该文档知识吗？这将不能恢复。")) return;

    setDocsMap((prev) => ({
      ...prev,
      [selectedFolderId]: (prev[selectedFolderId] || []).filter((d) => d.id !== docId),
    }));

    setFolders((prev) =>
      prev.map((f) =>
        f.id === selectedFolderId ? { ...f, docCount: Math.max(0, f.docCount - 1) } : f
      )
    );

    fetch(`/api/documents/${docId}`, { method: "DELETE" }).catch(() => {});
  };

  const handleRenameFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    const newName = prompt("请输入新的知识库名称：", folder.name);
    if (newName && newName.trim()) {
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, name: newName.trim() } : f))
      );
      fetch(`/api/knowledge-bases/${folderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      }).catch(() => {});
    }
  };

  const handleManualUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportKbWords = async () => {
    if (!selectedFolderId) return;
    try {
      const res = await fetch(`/api/words?knowledge_base_ids=${selectedFolderId}&pageSize=10000`);
      const data = await res.json();
      const words = data.words ?? [];
      if (words.length === 0) {
        alert("该知识库暂无词汇数据");
        return;
      }
      const header = "Word\tDefinition\tPhonetic\tExample EN\tExample CN";
      const lines = words.map(
        (w: any) =>
          `${w.spelling}\t${w.definition}\t${w.phonetic || ""}\t${w.exampleSentences?.[0]?.en || ""}\t${w.exampleSentences?.[0]?.cn || ""}`
      );
      triggerDownload([header, ...lines].join("\n"), `${selectedFolder.name}_词汇表.txt`);
    } catch {
      alert("导出失败，请检查网络连接");
    }
  };

  const handleExportDocWords = async (docId: string, docName: string) => {
    try {
      const res = await fetch(`/api/words?document_id=${docId}&pageSize=10000`);
      const data = await res.json();
      const words = data.words ?? [];
      if (words.length === 0) {
        alert("该文档暂无词汇数据");
        return;
      }
      const header = "Word\tDefinition\tPhonetic\tExample EN\tExample CN";
      const lines = words.map(
        (w: any) =>
          `${w.spelling}\t${w.definition}\t${w.phonetic || ""}\t${w.exampleSentences?.[0]?.en || ""}\t${w.exampleSentences?.[0]?.cn || ""}`
      );
      const baseName = docName.replace(/\.[^.]+$/, "");
      triggerDownload([header, ...lines].join("\n"), `${baseName}_解析词汇.txt`);
    } catch {
      alert("导出失败，请检查网络连接");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        handleUploadFile(files[i]);
      }
    }
  };

  return (
    <AppShell title="知识库">
      <div className="space-y-8 animate-fade-in font-sans">
        {/* Top Header Search Bar */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchDocValue}
              onChange={(e) => setSearchDocValue(e.target.value)}
              className="block w-full pl-11 pr-4 py-2.5 bg-[#f1f5f9] border border-transparent rounded-xl text-sm placeholder-slate-450 focus:outline-none focus:bg-white focus:border-blue-500 hover:bg-[#e2e8f0]/70 transition-all font-medium text-slate-800"
              placeholder="搜索文档或知识库..."
            />
          </div>
          <div className="text-xs text-slate-400 font-semibold tracking-wide">
            当前定位: {selectedFolder.name}
          </div>
        </div>

        {/* Main Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Drawer Navigation */}
          <div className="lg:col-span-1 space-y-4">
            <button
              id="btn-add-folder"
              onClick={handleCreateFolderClick}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer transition-transform duration-100 active:scale-98"
            >
              <Plus className="w-5 h-5" />
              <span>新增知识库</span>
            </button>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">最近访问</h3>

              <div className="space-y-1">
                {folders.map((folder) => {
                  const isSelected = folder.id === selectedFolderId;
                  return (
                    <div
                      key={folder.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isSelected
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <button
                        id={`folder-${folder.id}`}
                        onClick={() => setSelectedFolderId(folder.id)}
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                      >
                        {isSelected ? (
                          <FolderOpen className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate text-xs">{folder.name}</span>
                        {folder.isSystem && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 ml-1 shrink-0">
                            系统
                          </span>
                        )}
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <span className="text-[11px] font-bold py-0.5 px-2 rounded-full tracking-wide bg-slate-100 text-slate-400 font-sans">
                          {folder.docCount}
                        </span>
                        {folder.id !== "__default__" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameFolder(folder.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                            title="重命名"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {folder.id !== "__default__" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(folder.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all"
                            title="删除知识库"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Detail Panel and Action Desk */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header Description */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md">核心库</span>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                      {selectedFolder.name}
                    </h2>
                    {selectedFolder.isSystem && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        selectedFolder.id === "__default__"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-blue-100 text-blue-600"
                      }`}>
                        {selectedFolder.id === "__default__" ? "系统只读" : "系统预设"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={handleExportKbWords}
                    className="px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-xl shadow-md shadow-blue-100 transition-colors cursor-pointer"
                  >
                    导出单词
                  </button>
                </div>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".pdf,.docx,.txt"
              multiple
              className="hidden"
            />

            {/* Drag and Drop Box */}
            <div
              id="drag-upload-container"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleManualUpload}
              className={`cursor-pointer border-2 border-dashed py-12 px-6 rounded-2xl flex flex-col justify-center items-center text-center transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 scale-[0.99]"
                  : "border-slate-200 bg-slate-50 hover:bg-blue-50/20 hover:border-blue-400"
              }`}
            >
              <UploadCloud className="w-12 h-12 text-blue-600 animate-bounce mb-4" />
              <h3 className="text-sm font-bold text-slate-800">
                点击或拖拽上传新文档
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium font-mono">
                支持 PDF, DOCX, TXT | 最大 50MB
              </p>
            </div>

            {/* Uploaded Documents Table */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
                  <span>已上传文档</span>
                </h3>
                <button className="flex items-center gap-1 text-xs text-slate-450 hover:text-slate-600 font-bold transition-all">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>按时间排序</span>
                </button>
              </div>

              {filteredDocs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold font-sans">
                  当前知识库文件夹暂无上传文档
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">文件名</th>
                        <th className="px-6 py-4">状态</th>
                        <th className="px-6 py-4">词汇量</th>
                        <th className="px-6 py-4">上传时间</th>
                        <th className="px-6 py-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <FileText
                                className={`w-5 h-5 shrink-0 ${
                                  doc.name.endsWith(".pdf") ? "text-rose-500" : "text-blue-500"
                                }`}
                              />
                              <span className="font-semibold text-slate-700">{doc.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {doc.status === "processing" ? (
                              <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                <span className="text-xs">计算中 ({doc.progress || 0}%)</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs">已完成</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-slate-500 text-xs">
                            {doc.status === "processing" ? (
                              <span className="text-slate-400 italic">计算中...</span>
                            ) : (
                              doc.wordCount.toLocaleString()
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-400 font-sans">
                            {doc.uploadDate}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              {doc.status === "completed" && (
                                <button
                                  onClick={() => handleExportDocWords(doc.id, doc.name)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="导出解析"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDocDelete(doc.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="删除文档"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Knowledge Base Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center h-full p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 border border-slate-100 animate-scale-up space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>新建知识库</span>
                </h3>
                <button
                  onClick={() => { setShowCreateModal(false); setIsCreating(false); isCreatingRef.current = false; }}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmCreateFolder} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    知识库名称
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="如：学术英语阅读材料、公司法核心诉讼案..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="block w-full border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm py-3 px-4 font-semibold"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setIsCreating(false); isCreatingRef.current = false; }}
                    className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={!newFolderName.trim() || isCreating}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isCreating ? "创建中..." : "确认"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
