import * as React from "react";

import { cn } from "@/lib/utils";
import { UI_RADIUS, UI_SURFACE_SHADOW } from "@/components/ui/ui-cohesion";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          `flex h-10 w-full ${UI_RADIUS} border border-input bg-background px-3 py-2 text-sm ${UI_SURFACE_SHADOW} ring-offset-background transition-[box-shadow,border-color] duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:shadow-[var(--elevation-2)] hover:border-border disabled:cursor-not-allowed disabled:opacity-50`,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
