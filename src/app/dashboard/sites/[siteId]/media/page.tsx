import Link from "next/link";
import { MediaManager } from "@/components/saas/media-manager";
import { Button } from "@/components/ui/button";

export default async function SiteMediaPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Asset Manager</h1>
          <p className="text-muted-foreground">Folders, bulk uploads, rename/delete, and pre-upload image transforms.</p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/pages`}>
          <Button variant="outline">Back to Pages</Button>
        </Link>
      </div>
      <MediaManager siteId={siteId} />
    </div>
  );
}

