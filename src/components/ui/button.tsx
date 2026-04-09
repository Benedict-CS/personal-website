import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { UI_MOTION_EASE, UI_RADIUS, UI_SURFACE_SHADOW } from "@/components/ui/ui-cohesion";

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap ${UI_RADIUS} text-sm font-medium transition-[transform,box-shadow,background-color,border-color,opacity] duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-transparent aria-invalid:ring-destructive/30 aria-invalid:border-destructive active:scale-[0.97] active:duration-100`,
  {
    variants: {
      variant: {
        default:
          `bg-primary text-primary-foreground ${UI_SURFACE_SHADOW} hover:bg-primary/92 hover:shadow-[var(--elevation-2)] active:shadow-[var(--elevation-1)]`,
        destructive:
          "bg-destructive text-white shadow-[var(--elevation-1)] hover:bg-destructive/90 focus-visible:ring-destructive/30 hover:shadow-[var(--elevation-2)] active:shadow-[var(--elevation-1)]",
        outline:
          "border border-input bg-background shadow-[var(--elevation-1)] hover:bg-accent hover:text-accent-foreground hover:border-border hover:shadow-[var(--elevation-2)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--elevation-1)] hover:bg-secondary/85 hover:shadow-[var(--elevation-2)]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        glass:
          "bg-background border border-border text-foreground shadow-[var(--elevation-2)] backdrop-blur-sm hover:shadow-[var(--elevation-3)] hover:bg-accent/30 active:shadow-[var(--elevation-1)]",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
    }
>(function Button(
  { className, variant = "default", size = "default", asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : "button";
  const motionEase = UI_MOTION_EASE;

  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      style={{ transitionTimingFunction: `cubic-bezier(${motionEase.join(",")})` }}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
