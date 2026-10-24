"use client";

import { useActionState, useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";

import { platformLogin } from "@/app/plataforma/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PlatformLoginForm() {
  const [state, action, pending] = useActionState(platformLogin, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-4.5">
      {state.mensaje && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-semibold text-destructive animate-in fade-in duration-200"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{state.mensaje}</span>
        </div>
      )}

      <div>
        <label htmlFor="correo" className="mb-1.5 block text-[13px] font-semibold text-foreground">
          Correo electrónico
        </label>
        <div className="relative">
          <Input
            id="correo"
            name="correo"
            type="email"
            required
            autoComplete="username"
            placeholder="admin@softflyer.pe"
            className="h-11 pl-10 text-sm"
          />
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
        </div>
      </div>

      <div>
        <label htmlFor="contrasena" className="mb-1.5 block text-[13px] font-semibold text-foreground">
          Contraseña
        </label>
        <div className="relative">
          <Input
            id="contrasena"
            name="contrasena"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            className="h-11 pl-10 pr-10 text-sm"
          />
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground/70 transition-colors hover:text-foreground focus:outline-none"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          isLoading={pending}
          className="h-11 w-full gap-2 rounded-xl bg-[#0c5ea7] hover:bg-[#083f71] text-sm font-bold text-white shadow-md shadow-[#0c5ea7]/25 transition-all active:scale-[0.99]"
        >
          <span>{pending ? "Autenticando…" : "Ingresar a la plataforma"}</span>
          {!pending && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </form>
  );
}
