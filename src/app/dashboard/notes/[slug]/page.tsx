import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface NotePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function NoteViewPage({ params }: NotePageProps) {
  const { slug } = await params;

  // 檢查登入狀態
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/signin");
  }

  // 只能查看 unpublished 的文章（筆記）
  const note = await prisma.post.findFirst({
    where: {
      slug: slug,
      published: false,
    },
    include: {
      tags: true,
    },
  });

  if (!note) {
    notFound();
  }

  // 找同分類的上一篇/下一篇（按創建時間排序，可連續瀏覽）
  // @ts-ignore - category field will be available after migration
  const category = note.category || null;
  
  // 找同分類的所有筆記（按創建時間排序），用於導航
  // @ts-ignore
  const allNotesInCategory = await prisma.post.findMany({
    where: {
      published: false,
      // @ts-ignore
      category: category,
    },
    orderBy: {
      createdAt: "asc", // 按時間正序排列
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  // 找到當前筆記在列表中的位置
  const currentIndex = allNotesInCategory.findIndex((n) => n.id === note.id);
  
  // 上一篇：當前位置的前一個
  const prevNote = currentIndex > 0 ? allNotesInCategory[currentIndex - 1] : null;
  
  // 下一篇：當前位置的後一個
  const nextNote = currentIndex < allNotesInCategory.length - 1 ? allNotesInCategory[currentIndex + 1] : null;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/notes">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Notes
          </Button>
        </Link>
        <Link href={`/dashboard/posts/${note.id}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-slate-900">
              {note.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Badge variant="secondary">Draft / Note</Badge>
              <span>Last updated: {formatDate(note.updatedAt)}</span>
            </div>
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <Badge key={tag.id} variant="outline">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <article className="prose prose-slate max-w-none">
            <MarkdownRenderer content={note.content} postId={note.id} editable={true} />
          </article>
        </CardContent>
            </Card>

            {/* 上一篇/下一篇導航 */}
            {(prevNote || nextNote) && (
              <div className="flex items-center justify-between gap-4 mt-6">
                <div className="flex-1">
                  {prevNote ? (
                    <Link href={`/dashboard/notes/${prevNote.slug}`}>
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="text-sm font-medium truncate">{prevNote.title}</span>
                      </Button>
                    </Link>
                  ) : (
                    <div />
                  )}
                </div>
                <div className="flex-1">
                  {nextNote ? (
                    <Link href={`/dashboard/notes/${nextNote.slug}`}>
                      <Button variant="outline" className="w-full justify-end gap-2">
                        <span className="text-sm font-medium truncate">{nextNote.title}</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }
