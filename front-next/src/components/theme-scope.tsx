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
      // Sin almacenamiento
    }

    const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const isDark = saved !== null ? saved === "oscuro" : systemQuery.matches;

    root.dataset.theme = theme;
    if (fontClasses.length > 0) {
      root.classList.add(...fontClasses);
    }
    root.classList.toggle("dark", isDark);

    // Si el usuario no ha forzado un tema manualmente, adaptarse en tiempo real al SO
    const handleSystemChange = (e: MediaQueryListEvent) => {
      try {
        if (!window.localStorage.getItem(THEME_MODE_KEY)) {
          root.classList.toggle("dark", e.matches);
        }
      } catch {
        root.classList.toggle("dark", e.matches);
      }
    };

    systemQuery.addEventListener("change", handleSystemChange);

    return () => {
      systemQuery.removeEventListener("change", handleSystemChange);
      delete root.dataset.theme;
      root.classList.remove("dark", ...fontClasses);
    };
  }, [theme, fontClass]);

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var m=localStorage.getItem('${THEME_MODE_KEY}');var d=m!==null?m==='oscuro':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`,
      }}
    />
  );
}
