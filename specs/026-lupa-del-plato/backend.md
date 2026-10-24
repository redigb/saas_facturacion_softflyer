# 026 — Backend

## Contrato

**Sin cambios.** La foto ya viaja en el menú (`imagen_url`, spec 023) y la pantalla es la misma para ambos roles.

## Decisiones

- El modal usa la imagen ya comprimida que sirve el disco `public`: no hay endpoint nuevo ni procesamiento extra.

## Tareas

- [x] Confirmar que `GET /carta` ya entrega `imagen_url` por producto (spec 023)
