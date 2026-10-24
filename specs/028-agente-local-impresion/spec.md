# 028 — Agente local de impresión (ESC/POS) — PENDIENTE DE DISEÑO

**Estado:** ⚪ Pendiente de diseño (arquitectura definida en Doc. 05 §6; se implementa cuando haya una impresora real que probar)
**Backend:** ⚪ · **Frontend:** ⚪
**Documentos:** Doc. 05 §6 y §11 · Doc. 08 §8 · Doc. 09 §6 · spec 027

## Qué resuelve

Impresión **automática** de comandas en la impresora térmica de cada estación, sin que nadie toque nada: al enviar un pedido, el papel sale en cocina/barra. La nube **no puede** imprimir en la red local del restaurante (Doc. 05 §6); por eso se necesita un **agente local** instalado en una PC/Raspberry del local.

## Arquitectura propuesta (a validar)

1. **Agente** (Node.js, servicio que arranca con Windows/servicio Linux) instalado por restaurante.
   - **Conexión A — impresora de RED** (fase 1 del agente): TCP directo al puerto **9100** (ESC/POS), lo más común (Epson TM, Xprinter, etc.).
   - **Conexión B — USB** (fase 2 del agente): impresora conectada al mismo equipo (spool del sistema o escritura raw).
2. **Cómo recibe las comandas** (a decidir en el diseño):
   - *Opción recomendada:* **short-polling** a un endpoint nuevo (`GET /cocina/comandas/pendientes-impresion?estacion_id=…`) cada pocos segundos — sin abrir Reverb al mundo, más simple de firewall que TCP saliente a WebSockets, y tolerante a cortes (reintenta solo).
   - *Alternativa:* suscriptor del canal Reverb existente (`sucursal.{id}.estacion.{id}`).
3. **Autenticación**: token Sanctum con permisos mínimos (nuevo permiso/rol «Impresora» o token de dispositivo acotado a una estación/sucursal).
4. **Marca e idempotencia**: al imprimir con éxito, `POST …/impresa` (spec 027) — el agente reintenta lo no marcado. La **primera marca gana** (igual que en la 027).
5. **Reimpresión**: acción desde el KDS (ya existe el botón) con una orden de impresión puntual pendiente (cola en el agente); el servidor expone qué comanda reimprimir.
6. **Fallo controlado**: si la impresora/agente caen, el KDS sigue funcionando; al volver, el agente imprime lo pendiente (o avisa «no imprimió N comandas»).

## Modo simulador (clave para desarrollarlo sin hardware)

- El agente soporta `--simulado` (o `--imprimir-a archivo.log`): escribe el ESC/POS en un archivo/log en vez de mandarlo por red → se puede **probar todo el flujo end-to-end sin impresora** y grabar fixtures de prueba.
- Con una impresora de red real: `--impresora 192.168.1.50:9100` para la prueba final en local.

## Preguntas abiertas

- ¿Algún cliente con impresora confirmada (marca/modelo/red o USB) para la prueba real?
- ¿La impresión la dispara el **envío** (comanda completa) o también los **cambios** (plato anulado, reimpresión de solo-agregados)?
- ¿Se imprime también el **comprobante de venta** por el agente o se queda en el navegador (spec 010)?
- ¿Un agente por local (multiestación) o uno por estación?

## Fuera de alcance mientras esté pendiente

- No hay código aún: la 027 (impresión por navegador) es la solución operativa actual.
