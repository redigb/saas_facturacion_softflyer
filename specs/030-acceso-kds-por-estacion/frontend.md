# 030 — Frontend

## Para quién y dónde

- **Administrador:** configura al personal desde Equipo en laptop o tablet.
- **Cocinero/barista:** abre el KDS en celular, tablet o monitor táctil durante el servicio; la impresora térmica es opcional.

## Flujo

1. En Equipo, el administrador crea o edita a una persona con rol Cocinero.
2. Aparece «Estaciones KDS» con tarjetas seleccionables: Cocina, Barra, Parrilla, General, etc.
3. Guarda una o varias estaciones.
4. Al entrar al KDS, esa persona solo puede elegir las estaciones asignadas.
5. Si tiene una sola, entra directamente; si no tiene ninguna, ve una explicación para solicitar acceso.

## Experiencia

| Tema | Decisión |
|---|---|
| Configuración | Selección textual con casillas grandes; no depende solo del color |
| KDS | Selector únicamente con opciones autorizadas; una sola opción abre directamente |
| Sin acceso | Estado vacío claro, sin errores técnicos ni bucles de peticiones |
| Cambio de asignación | Una estación guardada previamente pero retirada deja de abrir y obliga a elegir otra |
| Táctil | Áreas de selección de al menos 44 px y separación suficiente |

## Tareas

- [x] Esquemas y consultas de estaciones/autorizaciones KDS.
- [x] Selector de estaciones filtrado y estado sin asignación.
- [x] Configuración «Estaciones KDS» en el formulario de Equipo.
- [x] `npm run lint`, `npx tsc --noEmit` y auditoría del archivo modificado.
