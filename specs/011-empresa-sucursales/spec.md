# 011 — Empresa y sucursales

**Estado:** ✅ Cerrada (2026-10-12; verificación manual en navegador a cargo del usuario)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** Configuración general (hoja de ruta del `README.md` de specs)
**Documentos:** Doc. 08 §11.2 (empresas y sucursales), Doc. 03 §5 (límites del plan), Doc. 06 §4 (`configuracion.*`)

## Qué y por qué

Hoy el dueño no puede cambiar nada de su empresa: el RUC, la razón social y la dirección salen del registro y no se editan, y "Configuración" en el menú no abre nada. Tampoco puede abrir un segundo local. Esta spec crea la pantalla **Configuración** con dos pestañas: **Empresa** (datos fiscales) y **Sucursales** (altas, edición, local principal, activar/desactivar), respetando el límite de sucursales del plan.

Los datos fiscales son lo primero que pide la facturación real (spec 017) y lo primero que el checklist del Inicio marca como pendiente.

## Criterios de aceptación

- [x] El administrador abre **Configuración** desde el menú y ve los datos de su empresa.
- [x] Puede corregir razón social, nombre comercial, dirección fiscal y distrito; el RUC se valida (11 dígitos, dígito verificador) y un RUC inválido muestra el motivo junto al campo.
- [x] Puede ver todas sus sucursales y crear una nueva con nombre, dirección, distrito y código de establecimiento.
- [x] Si su plan ya no permite más sucursales, ve un mensaje claro con el límite y no se crea nada.
- [x] Puede marcar otra sucursal como principal; siempre hay exactamente una.
- [x] Puede desactivar una sucursal sin actividad; no puede desactivar la principal, la última activa, ni una con pedidos o caja abiertos.
- [x] Una sucursal desactivada deja de aparecer para el equipo en pedidos, caja y cocina.
- [x] El checklist del Inicio enlaza "Datos fiscales" a la nueva pantalla y se marca completo al guardarlos.
- [x] Quien no tiene el permiso no ve "Configuración" ni puede usar sus endpoints.

## Fuera de alcance

- Certificado digital, usuario y clave SOL, series y homologación: llegan con Greenter (spec 017) y la gestión de series con la 012.
- Eliminar sucursales definitivamente (solo se desactivan).
- Asignar roles por sucursal desde esta pantalla (se hace en Equipo).
- Tasa reducida de IGV y afectación por producto (spec 017).
- Catálogo INEI completo de ubigeos: se usa el que haya cargado; la carga completa es un seeder aparte.
