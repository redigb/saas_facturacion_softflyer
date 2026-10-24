"use client";

import { Contrast } from "lucide-react";
import { useEffect, useState } from "react";

import { THEME_MODE_KEY } from "@/components/theme-scope";
import { Button } from "@/components/ui/button";

/** Alterna claro/oscuro del backoffice con animación de revelado circular expansivo. */
export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el estado con la clase real de <html> al montar
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next = !dark;

    const applyTheme = () => {
      setDark(next);
      document.documentElement.classList.toggle("dark", next);
      try {
        window.localStorage.setItem(THEME_MODE_KEY, next ? "oscuro" : "claro");
      } catch {
        // La preferencia es solo una comodidad
      }
    };

    // Verificación de compatibilidad con View Transitions y preferencias de accesibilidad
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => { ready: Promise<void> };
    };

    if (
      !doc.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      applyTheme();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = doc.startViewTransition(applyTheme);

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 450,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="size-9 rounded-xl border border-border/50 bg-muted/40 text-foreground transition-all hover:bg-muted hover:border-border active:scale-95 shadow-2xs"
    >
      <Contrast className="size-4" />
    </Button>
  );
}
