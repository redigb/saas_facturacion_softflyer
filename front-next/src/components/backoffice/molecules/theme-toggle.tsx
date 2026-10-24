"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { THEME_MODE_KEY } from "@/components/theme-scope";
import { Button } from "@/components/ui/button";

/** Alterna claro/oscuro del backoffice; la preferencia queda en este navegador. */
export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // ThemeScope ya aplicó el modo guardado: el botón solo lo refleja.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el estado con la clase real de <html> al montar
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(THEME_MODE_KEY, next ? "oscuro" : "claro");
    } catch {
      // La preferencia es solo una comodidad.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="size-9 rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
