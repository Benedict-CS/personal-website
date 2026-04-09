import Link from "next/link";
import { WysiwygEditor } from "@/components/saas/wysiwyg-editor";
import { Button } from "@/components/ui/button";

export default async function SiteEditorPage({
  params,
}: {
  params: Promise<{ siteId: string; pageId: string }>;
}) {
  const { siteId, pageId } = await params;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">True WYSIWYG Editor</h1>
          <p className="text-muted-foreground">Drag, style, version, and publish with tenant-level isolation.</p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/pages`}>
          <Button variant="outline">Back to Pages</Button>
        </Link>
      </div>
      <WysiwygEditor siteId={siteId} pageId={pageId} />
    </div>
  );
}

