# 017a — Configuración fiscal

**Estado:** Cerrada (2026-10-19), verificada por el dueño del producto
**Backend:** ✅ · **Frontend:** ✅
**Hito:** H3 real (Doc. 09 §2)
**Documentos:** Doc. 04 §3, §7, §9; Doc. 08 §11.1; spec 011 (empresa)

## Qué y por qué

Antes de emitir hay que dejar a cada empresa lista para SUNAT: su certificado digital, su usuario y clave SOL, su tasa de IGV y la afectación de sus productos. Todo se maneja desde el **panel de configuración** de la empresa, y el backoffice ve el estado sin ver los secretos.

## Criterios de aceptación

- [ ] El administrador de la empresa sube su certificado `.pfx` o `.p12` con su contraseña; queda guardado cifrado y la pantalla muestra solo titular, vencimiento y estado.
- [ ] Guarda usuario y clave SOL; la clave no vuelve a mostrarse ni viaja al navegador.
- [ ] Un certificado vencido o con contraseña incorrecta se rechaza con un mensaje claro.
- [ ] Desde el panel elige la tasa de IGV vigente y marca qué productos son exonerados o inafectos; el resto es gravado.
- [x] Cada local indica si opera con IGV (zonas exoneradas); la afectación por producto es la excepción.
- [x] Softflyer puede bloquear la configuración fiscal: el dueño la ve pero no la cambia.
- [ ] Ninguna empresa emite en producción sin `homologado`; sin certificado y SOL completos no puede emitir.
- [ ] El backoffice muestra por cliente: certificado cargado, vencimiento y si está en beta u homologado.

## Fuera de alcance

- Emisión y envío (017b).
- Alta del usuario secundario y registro del certificado en el portal SUNAT: lo hace el cliente (Doc. 04 §7).
