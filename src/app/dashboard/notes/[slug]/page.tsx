import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { TableOfContents } from "@/components/toc";
import { extractTocHeadingsFromMarkdown } from "@/lib/markdown-toc";
import { ReadingProgress } from "@/components/reading-progress";
import { PrevNextKeys } from "@/components/prev-next-keys";
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

  // Check auth
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/signin");
  }

  // Only unpublished posts (notes)
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

  const tocHeadings = extractTocHeadingsFromMarkdown(note.content);

  // Prev/next in same category by creation time
  const category = note.category || null;
  
  // All notes in category for navigation
  const allNotesInCategory = await prisma.post.findMany({
    where: {
      published: false,
      category: category,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  // Current note index in list
  const currentIndex = allNotesInCategory.findIndex((n) => n.id === note.id);
  
  // Prev: previous in list
  const prevNote = currentIndex > 0 ? allNotesInCategory[currentIndex - 1] : null;
  
  // Next: next in list
  const nextNote = currentIndex < allNotesInCategory.length - 1 ? allNotesInCategory[currentIndex + 1] : null;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <ReadingProgress />
      <PrevNextKeys
        prevHref={prevNote ? `/dashboard/notes/${prevNote.slug}` : null}
        nextHref={nextNote ? `/dashboard/notes/${nextNote.slug}` : null}
      />
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

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_250px]">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold text-foreground">
                    {note.title}
                  </h1>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
                <article className="prose prose-slate max-w-none" data-post-content>
                  <MarkdownRenderer content={note.content} postId={note.id} editable={true} />
                </article>
              </CardContent>
            </Card>

            {/* Prev/Next in category */}
            {(prevNote || nextNote) && (
              <div className="flex items-center justify-between gap-4">
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

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <TableOfContents content={note.content} initialHeadings={tocHeadings} />
          </aside>
        </div>
      </div>
    </>
  );
}
