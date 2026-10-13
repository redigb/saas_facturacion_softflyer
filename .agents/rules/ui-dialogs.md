# Regla: Prohibición de Alertas y Diálogos Nativos del Navegador

**Alcance:** Todo el código Frontend (`front-next`).

## Regla Obligatoria
Está estrictamente prohibido invocar cuadros de diálogo y alertas nativas del navegador:
- ❌ `window.confirm()` o `confirm()`
- ❌ `window.alert()` o `alert()`
- ❌ `window.prompt()` o `prompt()`

Los diálogos nativos interrumpen la experiencia del usuario, rompen la armonía visual de la interfaz y muestran el origen del dominio en lugar de la identidad de marca de Softflyer.

## Estándar de Implementación
Para toda confirmación crítica (descartar cambios sin guardar, eliminar elementos, anular pedidos, acciones destructivas o irreversibles):
- Utilizar exclusivamente el componente de diálogo modal propio de la UI: `ConfirmDialog` de `@/components/ui` (`@/components/ui/molecules/confirm-dialog`).
- Debe incluir:
  - Título claro y conciso del impacto.
  - Descripción explicativa de las consecuencias.
  - Botón de cancelación (`variant="secondary"`).
  - Botón de confirmación con la variante correspondiente (`variant="danger"` o `variant="warning"`).
  - Cierre accesible con tecla `Escape` o clic en el fondo difuminado.
