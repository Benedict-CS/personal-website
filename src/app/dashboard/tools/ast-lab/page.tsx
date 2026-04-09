import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import { AstLabClient } from "./ast-lab-client";

export default function AstLabPage() {
  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Markdown AST lab"
        description="Parse Markdown to mdast (GFM + math). Inspect the tree or copy JSON for debugging pipelines and migrations."
      />
      <AstLabClient />
    </div>
  );
}
