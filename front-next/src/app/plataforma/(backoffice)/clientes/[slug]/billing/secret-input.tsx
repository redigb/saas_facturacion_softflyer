"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Campo de contraseña con botón para verla; el resto de props van al input. */
export function SecretInput({ revealLabel, ...props }: React.ComponentProps<typeof Input> & { revealLabel: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-12" />
      <Button
        type="button"
        variant="ghost"
        onClick={() => setVisible(!visible)}
        className="absolute right-1 top-1/2 h-9 min-h-0 w-9 -translate-y-1/2 p-0 text-muted-foreground"
        aria-label={visible ? `Ocultar ${revealLabel}` : `Ver ${revealLabel}`}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}
