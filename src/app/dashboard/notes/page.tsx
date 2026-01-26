"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Edit, ChevronDown, ChevronRight, Folder, Tag, Check, X, Search } from "lucide-react";

interface Note {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  updatedAt: string;
  tags: Array<{ id: string; name: string }>;
}

interface CategoryNode {
  name: string;
  path: string;
  notes: Note[];
  children: Map<string, CategoryNode>;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch("/api/posts?published=false");
        if (response.ok) {
          const data = await response.json();
          setNotes(data);
          setFilteredNotes(data);
          // 預設展開所有分類路徑
          const allPaths = new Set<string>();
          data.forEach((n: Note) => {
            if (n.category) {
              const parts = n.category.split("/");
              let currentPath = "";
              parts.forEach((part) => {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                allPaths.add(currentPath);
              });
            } else {
              allPaths.add("Uncategorized");
            }
          });
          setExpandedCategories(allPaths);
        }
      } catch (error) {
        console.error("Failed to fetch notes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, []);

  // 搜尋過濾
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = notes.filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(query);
      const contentMatch = note.content.toLowerCase().includes(query);
      const tagMatch = note.tags.some((tag) => tag.name.toLowerCase().includes(query));
      const categoryMatch = note.category?.toLowerCase().includes(query);
      return titleMatch || contentMatch || tagMatch || categoryMatch;
    });
    setFilteredNotes(filtered);
  }, [searchQuery, notes]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const toggleCategory = (path: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleStartEdit = (noteId: string, currentCategory: string | null) => {
    setEditingNoteId(noteId);
    setEditingCategory(currentCategory || "");
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingCategory("");
  };

  const handleSaveCategory = async (noteId: string) => {
    try {
      const response = await fetch(`/api/posts/${noteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: editingCategory || null,
        }),
      });

      if (response.ok) {
        setEditingNoteId(null);
        setEditingCategory("");
        
        // 重新整理以更新分組
        const refreshResponse = await fetch("/api/posts?published=false");
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setNotes(data);
          // 保持已展開的分類
          const allPaths = new Set<string>();
          data.forEach((n: Note) => {
            if (n.category) {
              const parts = n.category.split("/");
              let currentPath = "";
              parts.forEach((part) => {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                allPaths.add(currentPath);
              });
            } else {
              allPaths.add("Uncategorized");
            }
          });
          setExpandedCategories(allPaths);
        }
      } else {
        alert("Failed to update category");
      }
    } catch (error) {
      console.error("Failed to update category:", error);
      alert("Failed to update category");
    }
  };

  // 建立階層式分類結構（使用過濾後的筆記）
  const buildCategoryTree = () => {
    const root = new Map<string, CategoryNode>();

    filteredNotes.forEach((note) => {
      if (!note.category) {
        // Uncategorized notes
        if (!root.has("Uncategorized")) {
          root.set("Uncategorized", {
            name: "Uncategorized",
            path: "Uncategorized",
            notes: [],
            children: new Map(),
          });
        }
        root.get("Uncategorized")!.notes.push(note);
      } else {
        // 解析階層路徑 (e.g., "LeetCode/HashMap" -> ["LeetCode", "HashMap"])
        const parts = note.category.split("/").filter((p) => p.trim());
        let currentLevel = root;
        let currentPath = "";

        parts.forEach((part, index) => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          
          if (!currentLevel.has(part)) {
            currentLevel.set(part, {
              name: part,
              path: currentPath,
              notes: [],
              children: new Map(),
            });
          }

          const node = currentLevel.get(part)!;

          // 如果是最後一層，將 note 放入此節點
          if (index === parts.length - 1) {
            node.notes.push(note);
          }

          // 移動到下一層
          currentLevel = node.children;
        });
      }
    });

    return root;
  };

  // 計算節點內所有 notes 總數（包含子節點）
  const countNotesInNode = (node: CategoryNode): number => {
    let count = node.notes.length;
    node.children.forEach((child) => {
      count += countNotesInNode(child);
    });
    return count;
  };

  // 遞歸渲染分類節點
  const renderCategoryNode = (node: CategoryNode, level: number): React.ReactNode => {
    const isExpanded = expandedCategories.has(node.path);
    const totalNotes = countNotesInNode(node);
    const hasChildren = node.children.size > 0;

    return (
      <div key={node.path} className="space-y-4" style={{ marginLeft: `${level * 1.5}rem` }}>
        <button
          onClick={() => toggleCategory(node.path)}
          className="flex items-center gap-2 text-left w-full group"
        >
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-slate-600" />
          ) : (
            <ChevronRight className="h-5 w-5 text-slate-600" />
          )}
          <Folder className="h-5 w-5 text-slate-500" />
          <h3 className={`${level === 0 ? "text-xl" : "text-lg"} font-semibold text-slate-900 group-hover:text-slate-700`}>
            {node.name}
          </h3>
          <span className="text-sm text-slate-500">({totalNotes})</span>
        </button>

        {isExpanded && (
          <div className="space-y-4">
            {/* 顯示此層級的 notes */}
            {node.notes.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 ml-7">
                {node.notes.map((note) => (
                  <Card key={note.id} className="h-full flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="line-clamp-2 text-base">
                          {note.title}
                        </CardTitle>
                      </div>
                      
                      {/* Category Edit UI */}
                      {editingNoteId === note.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            placeholder="e.g., LeetCode/Array"
                            value={editingCategory}
                            onChange={(e) => setEditingCategory(e.target.value)}
                            className="h-8 text-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveCategory(note.id);
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleSaveCategory(note.id)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {/* Category row */}
                          <div className="flex items-center gap-2 text-xs">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs hover:bg-slate-100 text-slate-600"
                              onClick={() => handleStartEdit(note.id, note.category)}
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {note.category || "Add category"}
                            </Button>
                          </div>
                          
                          {/* Date and tags row */}
                          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                            <span>{formatDate(note.updatedAt)}</span>
                            {note.tags && note.tags.length > 0 && (
                              <>
                                <span>•</span>
                                <div className="flex flex-wrap gap-1">
                                  {note.tags.map((tag) => (
                                    <Badge key={tag.id} variant="secondary" className="text-xs">
                                      {tag.name}
                                    </Badge>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between">
                      <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                        {/* @ts-ignore */}
                        {note.description || `${note.content.substring(0, 150)}...`}
                      </p>
                      <div className="flex gap-2">
                        <Link href={`/dashboard/notes/${note.slug}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full gap-2">
                            <FileText className="h-4 w-4" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/dashboard/posts/${note.id}`} className="flex-1">
                          <Button variant="default" size="sm" className="w-full gap-2">
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 遞歸顯示子分類 */}
            {hasChildren && (
              <div className="space-y-4">
                {Array.from(node.children.keys())
                  .sort((a, b) => a.localeCompare(b))
                  .map((childName) => {
                    const childNode = node.children.get(childName)!;
                    return renderCategoryNode(childNode, level + 1);
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const categoryTree = buildCategoryTree();

  // 排序：Uncategorized 放最後
  const sortedRootCategories = Array.from(categoryTree.keys()).sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">My Notes</h2>
            <p className="text-sm text-slate-600 mt-1">Private notes (unpublished posts)</p>
          </div>
        </div>
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">My Notes</h2>
          <p className="text-sm text-slate-600 mt-1">Private notes (unpublished posts)</p>
        </div>
        <Link href="/dashboard/posts/new">
          <Button>Create New Note</Button>
        </Link>
      </div>

      {/* 搜尋框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Search notes by title, content, tags, category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 搜尋結果統計 */}
      {searchQuery && (
        <div className="text-sm text-slate-600">
          Found {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
        </div>
      )}

      {notes.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <p className="text-slate-500">No notes yet</p>
          <p className="text-sm text-slate-400 mt-2">Create a new post and keep it as Draft to use as a note</p>
        </div>
      ) : filteredNotes.length === 0 && searchQuery ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500">No notes found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedRootCategories.map((categoryName) => {
            const node = categoryTree.get(categoryName)!;
            return renderCategoryNode(node, 0);
          })}
        </div>
      )}
    </div>
  );
}
