import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow-2xs hover:bg-destructive/90",
        outline: "text-foreground border border-border",
        success: "border-transparent bg-emerald-100 text-emerald-800 font-bold",
        warning: "border-transparent bg-amber-100 text-amber-800 font-bold",
        info: "border-transparent bg-info/20 text-primary font-bold",
        danger: "border-transparent bg-red-100 text-red-700 font-bold",
        neutral: "border-transparent bg-muted text-foreground/70",
        code: "border-border bg-muted text-foreground/70 font-mono text-[11px]",
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
