import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardPanel } from "@/components/dashboard/dashboard-ui";
import { cn } from "@/lib/utils";

type RegistryLookupShellProps = {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  query: string;
  onQueryChange: (v: string) => void;
  onLookup: () => void;
  loading: boolean;
  error: string | null;
  inputLabel: string;
  placeholder?: string;
  children?: React.ReactNode;
};

/**
 * Shared layout for dashboard “type a package name → call integration API” panels (npm, PyPI, etc.).
 */
export function RegistryLookupShell({
  icon: Icon,
  title,
  description,
  query,
  onQueryChange,
  onLookup,
  loading,
  error,
  inputLabel,
  placeholder = "package name",
  children,
}: RegistryLookupShellProps) {
  return (
    <DashboardPanel padding="md" className="border-border">
      <div className="flex flex-wrap items-start gap-3 sm:items-center">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          <div className="text-xs leading-relaxed text-muted-foreground">{description}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className={cn("max-w-xs font-mono text-sm")}
          aria-label={inputLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onLookup();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={loading}
          className="gap-2"
          onClick={onLookup}
        >
          {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
          Look up
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {children}
    </DashboardPanel>
  );
}
