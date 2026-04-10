"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Edit, ChevronDown, ChevronRight, Folder, Tag, Check, X, Search } from "lucide-react";
import { useToast } from "@/contexts/toast-context";
import { DashboardEmptyState, DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import { formatAbsoluteDateTime, formatRelativeTime } from "@/lib/relative-time";

interface Note {
  id: string;
  title: string;
  slug: string;
  content: string;
  description?: string | null;
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
  const { toast } = useToast();
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
        const response = await fetch("/api/posts?published=false", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setNotes(data);
          setFilteredNotes(data);
          // Expand all category paths by default
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

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = notes.filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(query);
      const slugMatch = note.slug.toLowerCase().includes(query);
      const descMatch = note.description?.toLowerCase().includes(query);
      const contentMatch = note.content.toLowerCase().includes(query);
      const tagMatch = note.tags.some((tag) => tag.name.toLowerCase().includes(query));
      const categoryMatch = note.category?.toLowerCase().includes(query);
      return (
        titleMatch ||
        slugMatch ||
        !!descMatch ||
        contentMatch ||
        tagMatch ||
        !!categoryMatch
      );
    });
    setFilteredNotes(filtered);
  }, [searchQuery, notes]);

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
        const nextCategory = editingCategory.trim() || null;
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, category: nextCategory } : n))
        );
        setEditingNoteId(null);
        setEditingCategory("");
        toast("Category updated", "success");

        const refreshResponse = await fetch("/api/posts?published=false", { credentials: "include" });
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setNotes(data);
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
        const err = await response.json().catch(() => ({}));
        toast((err as { error?: string }).error || "Failed to update category", "error");
      }
    } catch (error) {
      console.error("Failed to update category:", error);
      toast("Failed to update category", "error");
    }
  };

  // Build category tree from filtered notes
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
        // Parse path (e.g. "LeetCode/HashMap" -> ["LeetCode", "HashMap"])
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

          // Leaf: add note to this node
          if (index === parts.length - 1) {
            node.notes.push(note);
          }

          // Go to next level
          currentLevel = node.children;
        });
      }
    });

    return root;
  };

  // Count notes in node (including children)
  const countNotesInNode = (node: CategoryNode): number => {
    let count = node.notes.length;
    node.children.forEach((child) => {
      count += countNotesInNode(child);
    });
    return count;
  };

  // Render category node recursively
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
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
          <Folder className="h-5 w-5 text-muted-foreground" />
          <h3 className={`${level === 0 ? "text-xl" : "text-lg"} font-semibold text-foreground group-hover:text-foreground`}>
            {node.name}
          </h3>
          <span className="text-sm text-muted-foreground">({totalNotes})</span>
        </button>

        {isExpanded && (
          <div className="space-y-4">
            {/* Notes at this level */}
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
                              className="h-6 px-2 text-xs hover:bg-muted/70 text-muted-foreground"
                              onClick={() => handleStartEdit(note.id, note.category)}
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {note.category || "Add category"}
                            </Button>
                          </div>
                          
                          {/* Date and tags row */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span title={formatAbsoluteDateTime(note.updatedAt)}>
                              Updated {formatRelativeTime(note.updatedAt)}
                            </span>
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
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
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

            {/* Child categories */}
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

  // Sort: Uncategorized last
  const sortedRootCategories = Array.from(categoryTree.keys()).sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading notes">
        <DashboardPageHeader
          eyebrow="Notes"
          title="My notes"
          description="Private notes (unpublished posts)."
        >
          <Skeleton className="h-10 w-36 rounded-lg" />
        </DashboardPageHeader>
        <Skeleton className="h-10 w-full max-w-xl rounded-md" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-5 w-2/3 max-w-md mb-2" />
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-3 w-full max-w-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Notes"
        title="My notes"
        description="Private notes (unpublished posts)."
      >
        <Button asChild>
          <Link href="/dashboard/posts/new">Create new note</Link>
        </Button>
      </DashboardPageHeader>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
        <Input
          type="search"
          placeholder="Search by title, slug, description, content, tags, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          aria-label="Search notes"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search result count */}
      {searchQuery && (
        <div className="text-sm text-muted-foreground">
          Found {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
        </div>
      )}

      {notes.length === 0 ? (
        <DashboardEmptyState
          illustration="documents"
          title="No notes yet"
          description="Create a new post and keep it as a draft — drafts appear here grouped by category."
          className="py-12"
        >
          <Button asChild>
            <Link href="/dashboard/posts/new">New draft post</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/posts">Published posts</Link>
          </Button>
        </DashboardEmptyState>
      ) : filteredNotes.length === 0 && searchQuery ? (
        <DashboardEmptyState
          illustration="magnifier"
          title={`No notes match “${searchQuery}”`}
          description="Try different keywords, or clear the search to see all drafts."
          className="py-12"
        >
          <Button variant="outline" type="button" onClick={() => setSearchQuery("")}>
            Clear search
          </Button>
        </DashboardEmptyState>
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
