import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThreeShowroomBuilder } from "@/components/saas/three-showroom-builder";

export default async function SiteShowroomPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">3D Virtual Showroom</h1>
          <p className="text-slate-600">
            Drag-in 3D assets, raycast-select objects, adjust transforms, and walk through the scene.
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/pages`}>
          <Button variant="outline">Back to Pages</Button>
        </Link>
      </div>
      <ThreeShowroomBuilder siteId={siteId} />
    </div>
  );
}

