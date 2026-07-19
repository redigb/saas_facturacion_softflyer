# Guia de trabajo

Construye Softflyer como un producto confiable para negocios que no pueden detener sus ventas.

- Lee `docs-tecnicos/` antes de decidir contratos, datos o limites de seguridad.
- Prefiere cambios pequenos, claros y comprobables; no anticipes modulos futuros.
- Mantiene `/api/v1`, respuestas estandar y nombres de recursos en espanol.
- Nunca confies solo en filtros de aplicacion para aislar inquilinos: aplica RLS.
- Conserva la direccion de dependencias: Modulos -> Core.
- No bloquees una venta esperando servicios externos como SUNAT.
- Verifica backend, frontend y PostgreSQL antes de cerrar una implementacion.

Si el codigo contradice un documento tecnico, detente y resuelve la decision de forma explicita.
