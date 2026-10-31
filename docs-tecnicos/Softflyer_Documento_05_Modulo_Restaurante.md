# Especificación Técnica — SaaS Facturación Softflyer
## Documento N.° 05 — Módulo Restaurante

**Proyecto:** SaaS Facturación Softflyer
**Estado:** Diseño Arquitectónico
**Depende de:** Doc. N.° 01 (arquitectura, colas), Doc. N.° 02 (modelo de datos, tablas `salones`/`mesas`/`pedidos`), Doc. N.° 03 (multi-tenant), Doc. N.° 04 (Greenter — el pedido, al cobrarse, dispara este flujo sin que el módulo Restaurante conozca ningún detalle de SUNAT)

---

## 1. Objetivo y alcance

Este módulo cubre la operación diaria de un restaurante: salones, mesas, toma de pedidos, comandas a cocina, reservas y delivery. Todo lo que es facturación, inventario, caja y clientes ya existe en el Núcleo (Doc. N.° 02) y este módulo **solo lo consume**, respetando la regla de dependencia unidireccional fijada en el Doc. N.° 01 §9: el Núcleo no sabe que el módulo Restaurante existe.

---

## 2. Corrección necesaria al modelo del Documento N.° 02: un pedido puede generar más de una venta

🔧 En el Documento N.° 02, `pedidos` tenía una columna `venta_id` (opcional), asumiendo que un pedido genera **como máximo una** venta. Esto es incorrecto para un restaurante real: la **cuenta dividida** (varios comensales de la misma mesa pagan por separado, o pagan solo lo que consumieron) es una operación habitual, no un caso extremo — y con `pedidos.venta_id` como columna única, es físicamente imposible representarla.

**Corrección:**

- Se elimina `pedidos.venta_id`.
- Se agrega `ventas.pedido_id` (BIGINT FK opcional, apunta al pedido de origen). Un pedido puede tener **varias** ventas asociadas (1 pedido → N ventas), cada una con su propio comprobante si el cliente lo requiere.
- Se agrega la tabla pivote `venta_detalle_pedido` (`venta_id`, `detalle_pedido_id`), que indica **qué ítems del pedido quedaron cubiertos por cada venta**. Esto es lo que permite dividir la cuenta por plato, por comensal, o en partes iguales sin ambigüedad sobre qué ya se cobró.
- El pedido se considera **cerrado** cuando todos sus `detalle_pedidos` están cubiertos por al menos una fila en `venta_detalle_pedido` (o cuando el mozo lo cierra manualmente, por ejemplo ante una cortesía o un consumo interno que no se cobra).

Este ajuste no afecta a los demás módulos ni al Núcleo: `ventas.pedido_id` es una columna adicional en una tabla que ya existía, y `venta_detalle_pedido` es una tabla nueva exclusiva de este módulo.

---

## 3. Modelo de datos completo del módulo

### 3.1 `salones` y `mesas` (ya definidas en Doc. N.° 02, sin cambios)

Se agrega una tabla pivote nueva para un caso que el documento anterior no cubría:

### 3.2 `pedido_mesa` (unión de mesas)

🔧 Otro caso habitual no contemplado antes: un grupo grande ocupa **dos o más mesas juntas** bajo un solo pedido. Con `pedidos.mesa_id` como columna única, esto tampoco se puede representar.

| Columna | Tipo | Notas |
|---|---|---|
| pedido_id | BIGINT FK | |
| mesa_id | BIGINT FK | |

Se mantiene `pedidos.mesa_id` como la **mesa principal** (donde se sienta el mozo a tomar el pedido, útil para mostrar en el plano de salón), y `pedido_mesa` registra todas las mesas físicamente unidas a ese pedido. Para el caso normal (una mesa, un pedido) `pedido_mesa` tiene una sola fila; el caso de mesas unidas no exige una tabla ni una consulta distinta.

### 3.3 `pedidos` (ajustada)

| Columna | Tipo | Notas |
|---|---|---|
| id | BIGINT PK | |
| inquilino_id, sucursal_id | | |
| mesa_id | BIGINT FK opcional | Nulo para delivery/para llevar |
| mozo_id | BIGINT FK → `usuarios` | |
| cliente_id | BIGINT FK opcional | Para delivery o clientes frecuentes; opcional porque no todo consumo en salón identifica al cliente |
| estado | VARCHAR | Ver máquina de estados, sección 4 |
| numero_comensales | INT opcional | Útil para reportes y para dividir la cuenta "en partes iguales" |
| abierto_en / cerrado_en | TIMESTAMP | |

### 3.4 `detalle_pedidos` (comandas)

| Columna | Tipo | Notas |
|---|---|---|
| id | BIGINT PK | |
| pedido_id | BIGINT FK | |
| producto_id | BIGINT FK | |
| cantidad | INT | |
| notas | VARCHAR opcional | Texto libre ("sin cebolla") |
| estado_cocina | VARCHAR | `PENDIENTE`/`EN_PREPARACION`/`LISTO`/`ENTREGADO` |
| enviado_a_cocina_en | TIMESTAMP opcional | Marca cuándo se imprimió/envió la comanda, no cuándo se creó la fila — puede haber ítems agregados a un pedido ya abierto |

### 3.5 `modificadores` y `detalle_pedido_modificador`

🔧 Se agrega esto porque "notas" como texto libre no permite que la cocina filtre o reporte sobre modificaciones (ej. cuántas hamburguesas se piden "sin cebolla" al mes), y tampoco permite cobrar diferencial de precio en un modificador de pago ("extra queso +S/3").

| `modificadores` | Notas |
|---|---|
| inquilino_id, producto_id (opcional, si aplica solo a un producto) | |
| nombre | "Sin cebolla", "Extra queso", "Término medio" |
| precio_adicional | DECIMAL(12,2), puede ser 0 |

`detalle_pedido_modificador`: pivote `detalle_pedido_id`, `modificador_id`.

El campo `notas` de `detalle_pedidos` se mantiene para casos verdaderamente libres que no ameritan crear un modificador nuevo cada vez, pero cualquier modificador recurrente y con impacto en precio debe pasar a esta tabla.

### 3.6 `reservas`, `entregas` (delivery)

Se mantienen como se definieron en el Doc. N.° 02, con un ajuste a `reservas`:

- Se agrega `duracion_estimada_minutos` (INT), porque sin ella no hay forma de calcular si una mesa está realmente disponible para una nueva reserva o si se solapa con la anterior (ver sección 6).

---

## 4. Máquinas de estado

### 4.1 `mesas.estado`
```
LIBRE → OCUPADA → POR_COBRAR → LIBRE
  ↕
RESERVADA (temporal, se limpia automáticamente si no se ocupa en el tiempo previsto)
```
`POR_COBRAR` es un estado que el documento original no distinguía de `OCUPADA`: se necesita para que el plano de salón muestre visualmente qué mesas ya pidieron la cuenta y están esperando cobro, sin que el mozo tenga que abrir cada pedido para saberlo.

### 4.2 `pedidos.estado`
```
ABIERTO → EN_PREPARACION → SERVIDO → POR_COBRAR → CERRADO
                                              ↘ ANULADO
```
Un pedido puede tener ítems en distintos estados de cocina simultáneamente (algunos `LISTO`, otros `PENDIENTE`); el estado del pedido a nivel de cabecera refleja el estado más "adelantado" que tenga sentido mostrarle al mozo, no un promedio ni un mínimo.

### 4.3 `detalle_pedidos.estado_cocina`
```
PENDIENTE → EN_PREPARACION → LISTO → ENTREGADO
```
Este es el estado que consume el KDS (sección 5); es independiente del estado del pedido porque la cocina necesita granularidad por plato, no por mesa.

### 4.4 Precio congelado y promociones

Al enviar un plato, `detalle_pedidos.precio_unitario` toma el precio efectivo del momento: el de lista o el **promocional** si hay una promo vigente (spec 039). El descuento queda en `detalle_pedidos.descuento` y el nombre en `promocion_nombre`. Cambiar la carta o una promoción después no altera lo ya pedido ni lo ya cobrado; al cobrar, el descuento se copia a `detalle_ventas.descuento`. Las promociones se aplican solas dentro de su rango de fechas, días y horario, y el alcance directo a un plato gana sobre la promoción de su categoría.

---

## 5. Cocina (KDS) y estrategia de tiempo real

🔧 El documento original listaba "Cocina" y "KDS" como ítems del roadmap sin definir cómo llegan las comandas del mozo a la pantalla de cocina en tiempo real. Esto importa porque un KDS que se actualiza por *polling* cada varios segundos genera una demora perceptible en un ambiente de alta rotación.

**Decisión:** se usa **Laravel Reverb** (servidor de WebSockets incluido en el ecosistema Laravel) para el canal de eventos entre el pedido tomado por el mozo y la pantalla de cocina, en lugar de depender de Redis/Pusher — coherente con la decisión ya tomada en el Doc. N.° 01 de no requerir Redis en la Fase 1. Reverb no necesita Redis para operar en una sola instancia de servidor, que es el escenario de la Fase 1 (Doc. N.° 01 §16); si más adelante se escala horizontalmente a varios servidores Laravel, Reverb sí requiere un backend compartido (Redis) para sincronizar conexiones entre instancias — exactamente el mismo punto en el que ya estaba previsto habilitar Redis por configuración.

Flujo:
1. El mozo confirma el pedido (o agrega ítems a uno abierto) → evento `ComandaCreada` con los `detalle_pedidos` en estado `PENDIENTE`.
2. La pantalla de cocina (cliente Next.js suscrito al canal de su sucursal) recibe el evento y muestra la comanda.
3. El cocinero cambia el estado (`EN_PREPARACION` → `LISTO`) desde la propia pantalla del KDS → evento `EstadoComandaActualizado`, que el mozo recibe en su dispositivo para saber que el plato ya puede servirse.

---

## 6. Impresión física de comandas

🔧 Otro punto que el roadmap original no resolvía: muchos restaurantes en Perú siguen imprimiendo la comanda en una impresora térmica física en cocina, además de (o en vez de) mostrarla en una pantalla KDS. El backend de Laravel, corriendo en la nube, **no tiene forma de imprimir directamente en una impresora dentro de la red local del restaurante**.

**Decisión:** se contempla un **agente local de impresión** (una pequeña aplicación, ej. en Node.js o un servicio ligero, instalada en una PC o Raspberry Pi dentro del local) que:
- Se suscribe al mismo canal de eventos de Reverb (sección 5) o hace *polling* corto a un endpoint de la API.
- Al recibir una comanda nueva, la envía por red local (protocolo ESC/POS) a la impresora térmica.

Esto se documenta ahora como un requisito de arquitectura (existe un componente fuera del Core/Frontend que no habíamos contemplado), aunque su implementación puede diferirse a la Fase 2 si el cliente inicial solo usa pantalla KDS sin impresora física.

---

## 7. División de cuenta y pagos

Con el ajuste de la sección 2, dividir la cuenta es una operación soportada de forma nativa:

- **Por ítems:** el cajero selecciona qué `detalle_pedidos` va cada `venta`, y el sistema arma `venta_detalle_pedido` en consecuencia.
- **En partes iguales:** el sistema divide el `monto_total` del pedido entre `numero_comensales` (o el número que indique el cajero), generando N ventas con montos iguales; en este caso `venta_detalle_pedido` igual asocia todos los ítems a todas las ventas (para trazabilidad de qué se consumió), pero el monto de cada venta es la fracción correspondiente, no el valor de los ítems asociados.
- Cada venta resultante sigue el flujo normal del Núcleo: puede o no generar un comprobante (el cliente puede pedir boleta solo por su parte), y ese comprobante dispara el flujo de Greenter del Documento N.° 04 sin ninguna diferencia respecto a una venta de mostrador.

### 7.1 Propinas

Se agrega `ventas.monto_propina` (DECIMAL(12,2), default 0), separado del `monto_total` del comprobante — porque la propina en Perú generalmente **no** lleva IGV ni forma parte de la base imponible del comprobante, y mezclarla con el total facturable sería un error tributario, no solo de presentación.

---

## 8. Reservas: validación de solapamiento

Antes de confirmar una reserva, se valida contra `duracion_estimada_minutos` (sección 3.6):

```
existe conflicto si:
  nueva_reserva.mesa_id = reserva_existente.mesa_id
  Y los rangos [reservado_para, reservado_para + duracion_estimada_minutos] se solapan
```

Sin esta validación explícita, el sistema permitiría reservar la misma mesa dos veces en el mismo horario, lo cual solo se descubriría el día del evento — el peor momento posible para descubrirlo.

---

## 9. Delivery: interno vs. plataformas externas

El roadmap original (Fase 2) incluye "Delivery" sin distinguir dos escenarios que tienen implicancias técnicas distintas:

- **Delivery propio:** el restaurante tiene sus propios repartidores. Se cubre con la tabla `entregas` ya definida (Doc. N.° 02), sin cambios.
- **Plataformas externas (Rappi, PedidosYa, etc.):** esto no es un repartidor propio, sino un **pedido que entra desde afuera** vía una integración (webhook o API de la plataforma), que debe crear automáticamente un `pedido` con `mesa_id = NULL` y `cliente_id` genérico o del comensal si la plataforma lo provee. Esta integración no se diseña en este documento (corresponde a la Fase 2 del roadmap), pero se deja anotada la distinción para que, cuando se aborde, no se intente forzar el modelo de "repartidor propio" sobre un flujo que en realidad es de recepción de pedidos externos.

---

## 10. Roles específicos del módulo

Se agregan como roles de plantilla (Doc. N.° 02 §3.4, `roles` con `inquilino_id` nulo), reutilizando el IAM del Núcleo sin crear un sistema de permisos paralelo:

| Rol | Permisos relevantes |
|---|---|
| Mozo | crear/modificar pedidos, ver plano de salón, no accede a caja ni reportes financieros |
| Cocinero | ver/actualizar `estado_cocina` de `detalle_pedidos`, sin acceso a precios ni datos de cliente |
| Cajero | cerrar pedidos, dividir cuenta, registrar pagos, emitir comprobante — mismos permisos de caja ya definidos en el Núcleo |

---

## 11. Flujo end-to-end (resumen)

```
Mozo abre pedido en mesa (o varias mesas unidas)
        ↓
Agrega detalle_pedidos → evento Reverb → KDS / impresora
        ↓
Cocina actualiza estado_cocina por ítem
        ↓
Mozo marca pedido como SERVIDO
        ↓
Cliente pide la cuenta → mesa pasa a POR_COBRAR
        ↓
Cajero cierra el pedido: una o varias ventas (según división de cuenta)
        ↓
Cada venta → ¿requiere comprobante? → Núcleo (Doc. 02) → Greenter (Doc. 04)
        ↓
Mesa vuelve a LIBRE
```

---

## 12. Próximo documento

Según el índice original, el siguiente paso es el **Documento N.° 06 — Seguridad e IAM (Usuarios, Roles y Permisos)**, donde corresponde detallar el catálogo completo de permisos del sistema (no solo los de este módulo), la política de contraseñas, expiración de sesiones y el mecanismo de autenticación (Sanctum) ya anotado en el Documento N.° 01.
