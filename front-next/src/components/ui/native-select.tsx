import * as React from "react";

import { cn } from "@/lib/utils";

/** Selector nativo con el aspecto de Input: viaja en FormData sin estado extra, ideal para formularios del backoffice. */
const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex min-h-[44px] w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground transition-all focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
