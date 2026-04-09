import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import type { EditorTarget } from "@/lib/editor-route";

function metaForTarget(
  target: EditorTarget,
  customPageTitle: string | null | undefined,
): { title: string; description: string } {
  switch (target.kind) {
    case "home":
      return {
        title: "Home",
        description: "Edit hero, section order, and skills. Changes apply to the live home page after save.",
      };
    case "about":
      return {
        title: "About",
        description: "Edit the profile hero and intro. Upload CV from the floating bar when saving.",
      };
    case "contact":
      return {
        title: "Contact",
        description: "Edit intro copy above the live contact form.",
      };
    case "custom-page":
      return {
        title: customPageTitle?.trim() || `Page · /${target.slug}`,
        description: "Visual builder or raw markdown. Save to publish changes to the public URL.",
      };
  }
}

/**
 * Top-of-page title row for immersive routes, aligned with dashboard page headers.
 */
export function EditorImmersiveHeader({
  target,
  customPageTitle,
}: {
  target: EditorTarget;
  /** Resolved title for custom pages (optional until loaded). */
  customPageTitle?: string | null;
}) {
  const { title, description } = metaForTarget(target, customPageTitle);
  return (
    <div className="mb-8">
      <DashboardPageHeader eyebrow="Immersive editor" title={title} description={description} />
    </div>
  );
}
