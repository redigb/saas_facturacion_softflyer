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
          "flex min-h-[44px] w-full rounded-xl border bg-card px-3.5 py-2.5 text-base text-foreground transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          hasError
            ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-100"
            : "border-border focus-visible:border-primary focus-visible:ring-primary/10",
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
