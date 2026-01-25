import Link from "next/link";
import { FileText, FileCheck, Image as ImageIcon, Tags, User, StickyNote } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar - 固定在左側 */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-slate-200 bg-slate-50 p-6">
        <nav className="flex flex-col gap-4">
          <Link
            href="/dashboard/posts"
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Posts
          </Link>
          <Link
            href="/dashboard/notes"
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors"
          >
            <StickyNote className="h-4 w-4" />
            Notes
          </Link>
          <Link
            href="/dashboard/about"
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors"
          >
            <User className="h-4 w-4" />
            About & CV
          </Link>
          <Link
            href="/dashboard/media"
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors"
          >
            <ImageIcon className="h-4 w-4" />
            Media
          </Link>
          <Link
            href="/dashboard/tags"
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors"
          >
            <Tags className="h-4 w-4" />
            Tags
          </Link>
        </nav>
      </aside>
      {/* Main Content - 左邊留出 sidebar 的空間 */}
      <main className="ml-64 flex-1 bg-slate-50">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
