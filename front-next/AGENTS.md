<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Specs y Sistema de Diseño

1. **Specs:** Antes de construir una pantalla, lee la spec abierta en `../specs/`: `frontend.md` define la experiencia (flujo, estados, interactividad) y `backend.md` el contrato de la API que se consume tal cual. Si el contrato no alcanza, se cambia primero en la spec.
2. **Patrones UI/UX:** Cumple estrictamente con el skill [`softflyer-ui`](.agents/skills/softflyer-ui/SKILL.md) (ergonomía híbrida desktop/touch, botones generosos de 44–48px, sidebar colapsable, paleta de colores oficial Softflyer y micro-animaciones).
