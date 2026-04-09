"use client";

import type { LucideIcon } from "lucide-react";
import { Briefcase, Circle, Code, Layers, PenLine } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  code: Code,
  layers: Layers,
  "pen-line": PenLine,
  briefcase: Briefcase,
  circle: Circle,
};

export function SkillBlockIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const Icon = MAP[iconKey] ?? Circle;
  return <Icon className={className ?? "h-4 w-4 shrink-0 text-muted-foreground"} aria-hidden />;
}
