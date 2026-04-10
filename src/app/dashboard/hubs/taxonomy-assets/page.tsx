import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import { BookText, FolderTree, Image as ImageIcon, Tags } from "lucide-react";

const modules = [
  {
    id: "posts",
    title: "Posts",
    description: "Published article management, sorting, and bulk operations.",
    href: "/dashboard/posts",
    icon: BookText,
  },
  {
    id: "drafts",
    title: "Draft notes",
    description: "Pre-publication workspace for in-progress writing and review.",
    href: "/dashboard/notes",
    icon: FolderTree,
  },
  {
    id: "media",
    title: "Media assets",
    description: "Upload, optimize, and clean media files used across pages and posts.",
    href: "/dashboard/media",
    icon: ImageIcon,
  },
  {
    id: "taxonomy",
    title: "Tags & taxonomy",
    description: "Tag cleanup, merge operations, and taxonomy quality controls.",
    href: "/dashboard/tags",
    icon: Tags,
  },
] as const;

export default function TaxonomyAssetsHubPage() {
  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Hub"
        title="Content taxonomy & assets"
        description="Single entry-point for post lifecycle, media assets, and taxonomy operations."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module) => (
          <Card key={module.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <module.icon className="h-4 w-4 text-muted-foreground" />
                {module.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{module.description}</p>
              <Button asChild variant="outline" size="sm">
                <Link href={module.href}>Open {module.title.toLowerCase()}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
