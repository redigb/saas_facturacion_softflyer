# 017c — Estado y operación

**Estado:** Pendiente (depende de 017b)
**Backend:** ⚪ · **Frontend:** ⚪
**Documentos:** Doc. 04 §6

## Qué y por qué

Que el cajero y el administrador vean qué pasó con cada comprobante y puedan actuar, y que el backoffice vigile la facturación de todos los clientes.

## Alcance

- Estado SUNAT visible en la lista de comprobantes, con descargas de XML, CDR y ticket.
- Motivo de rechazo en lenguaje claro, corrección y reenvío.
- Evento en tiempo real al aceptarse o rechazarse, que avisa al cajero.
- Backoffice: comprobantes pendientes o rechazados por cliente y cola en revisión manual.

## Criterios de aceptación

- [ ] Un rechazo muestra el motivo y permite reenviar.
- [ ] El cajero se entera del rechazo sin recargar.
- [ ] El backoffice lista los clientes con comprobantes pendientes o en revisión manual.
