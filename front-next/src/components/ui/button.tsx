import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover hover:shadow",
        primary:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover hover:shadow",
        destructive:
          "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700",
        danger:
          "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700",
        outline:
          "border border-border bg-card text-foreground shadow-2xs hover:border-ring hover:bg-muted/60",
        secondary:
          "border border-border bg-card text-foreground shadow-2xs hover:border-ring hover:bg-muted/60",
        ghost:
          "bg-transparent text-foreground/70 hover:bg-muted hover:text-primary",
        link:
          "text-primary underline-offset-4 hover:underline",
        icon:
          "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/50 hover:text-primary",
      },
      size: {
        default: "min-h-[44px] px-4.5 py-2.5",
        sm: "min-h-[38px] px-3 py-1.5 text-xs",
        md: "min-h-[44px] px-4.5 py-2.5 text-sm",
        lg: "min-h-[50px] px-6 py-3 text-base",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, disabled, children, ...props }, ref) => {
    // Slot exige un único hijo: con asChild no se añade el spinner.
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    const Comp = "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
