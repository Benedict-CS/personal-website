import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-[background-color,border-color,transform,box-shadow] duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-sm)] hover:bg-primary/90 hover:shadow-[var(--shadow-sm)] active:scale-[0.98]",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground shadow-[var(--shadow-sm)] hover:bg-secondary/85 hover:shadow-[var(--shadow-sm)] active:scale-[0.98]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-[var(--shadow-sm)] hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--accent)]/60 hover:border-[var(--border)] active:scale-[0.98]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
