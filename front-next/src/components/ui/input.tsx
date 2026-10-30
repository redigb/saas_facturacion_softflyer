import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, hasError = false, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-h-[44px] w-full rounded-xl border border-input bg-background/80 px-3.5 py-2.5 text-base text-foreground shadow-2xs transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          hasError
            ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
            : "",
          className
        )}
        ref={ref}
        aria-invalid={hasError ? true : undefined}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
