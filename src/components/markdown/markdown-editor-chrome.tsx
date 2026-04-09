import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Shared chrome for markdown helper toolbars (dashboard post editor, etc.).
 */
export function MarkdownEditorChrome({
  label,
  icon: Icon,
  className,
  children,
}: {
  label: string;
  icon: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/25 p-2 shadow-[var(--elevation-1)]",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      {children}
    </div>
  );
}
