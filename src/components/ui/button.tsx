import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-transparent aria-invalid:ring-destructive/30 aria-invalid:border-destructive active:scale-[0.98] hover:transition-all",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-sm)] hover:bg-primary/92 hover:shadow-[var(--shadow-md)] hover:scale-[1.01] active:shadow-[var(--shadow-sm)]",
        destructive:
          "bg-destructive text-white shadow-[var(--shadow-sm)] hover:bg-destructive/90 focus-visible:ring-destructive/30 hover:shadow-[var(--shadow-md)] active:scale-[0.98]",
        outline:
          "border border-input bg-[var(--glass-bg)] shadow-[var(--shadow-sm)] hover:bg-accent hover:text-accent-foreground hover:border-border hover:shadow-[var(--shadow-md)] hover:scale-[1.01] backdrop-blur-sm",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--shadow-sm)] hover:bg-secondary/85 hover:shadow-[var(--shadow-md)] hover:scale-[1.01]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground hover:shadow-[var(--shadow-sm)] hover:scale-[1.01]",
        glass:
          "bg-[var(--glass-bg)] border border-[var(--glass-border)] text-foreground shadow-[var(--glass-shadow)] backdrop-blur-md hover:shadow-[var(--glass-shadow-hover)] hover:bg-[oklch(1_0_0/0.85)] hover:scale-[1.01] active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline hover:scale-100",
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

  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
