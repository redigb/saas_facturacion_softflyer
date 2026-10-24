"use client";

import { useLayoutEffect } from "react";

export const THEME_MODE_KEY = "softflyer:backoffice:modo";

/**
 * Aplica el tema de un módulo en <html> (data-theme, fuente y modo oscuro) para que los modales y
 * portales, que viven fuera del layout, hereden la misma paleta. Oscuro por defecto salvo que el
 * navegador guardara "claro".
 */
export function ThemeScope({ theme, fontClass }: { theme: string; fontClass?: string }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const fontClasses = fontClass?.split(" ").filter(Boolean) ?? [];
    let saved: string | null = null;

    try {
      saved = window.localStorage.getItem(THEME_MODE_KEY);
    } catch {
      // Sin almacenamiento: queda el modo oscuro.
    }

    root.dataset.theme = theme;
    if (fontClasses.length > 0) {
      root.classList.add(...fontClasses);
    }
    root.classList.toggle("dark", saved !== "claro");

    return () => {
      delete root.dataset.theme;
      root.classList.remove("dark", ...fontClasses);
    };
  }, [theme, fontClass]);

  return null;
}
