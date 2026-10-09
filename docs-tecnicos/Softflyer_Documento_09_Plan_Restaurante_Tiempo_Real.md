# Especificación Técnica — SaaS Facturación Softflyer
## Documento N.° 09 — Plan del Módulo Restaurante, Tiempo Real y Pruebas de Producción

**Proyecto:** SaaS Facturación Softflyer
**Estado:** Plan aprobado para implementación (H0 en curso)
**Depende de:** Doc. 01 (stack, asincronía), Doc. 05 (módulo Restaurante, Reverb), Doc. 07 (contratos, idempotencia), Doc. 08 (modelo de datos y lotes)
**Ajusta:** el orden de lotes del Doc. 08 §13 (el inventario deja de ser el último y opcional).

> Nota de numeración: el Doc. 08 había movido Infraestructura y DevOps al N.° 09. Ese documento pasa a ser el N.° 10.

---

## 1. Objetivos (definidos con el cliente piloto)

El primer restaurante piloto pidió tres cosas. Todo lo demás se prioriza en función de ellas.

| # | Necesidad del cliente | Objetivo técnico | Criterio de aceptación |
|---|---|---|---|
| 1 | **Pedidos en tiempo real** | El mozo toma la orden sin esperar al servidor; cocina la ve al instante | Respuesta de UI a cada toque **< 100 ms**; comanda visible en cocina **< 1 s (p95)** |
| 2 | **No facturar a mano** | Al cobrar, la boleta/factura se genera sola; SUNAT se resuelve en segundo plano | Cobrar = 1 clic + impresión; SUNAT caído no detiene la venta |
| 3 | **Control de stock / inventario** | Stock por producto que se descuenta al vender, con kardex | Stock actual, alerta de mínimo y kardex que explica cada movimiento |

---

## 2. Hitos

| Hito | Contenido | Lotes Doc. 08 | Desbloquea |
|---|---|---|---|
| **H0 — Base** | CRUD de carta (categorías, productos, modificadores, estaciones); editor de plano básico (salones, mesas); Reverb instalado; React Query + Zod en el front; tabla `claves_idempotencia` | 4, 5, 10 (parcial) | Sin carta ni mesas no hay pedidos |
| **H1 — Pedidos en tiempo real** | Pantalla del mozo, comandas por estación, KDS, aviso "plato listo", unión de mesas | 6 | Objetivo 1 |
| **H2 — Cobro y caja** | Apertura/cierre/arqueo, cobro con división de cuenta, pagos | 7 | Objetivos 2 y 3 |
| **H3 — Facturación automática** | Greenter, job de envío, boleta/factura al cobrar, resúmenes diarios | 8 | Objetivo 2 |
| **H4 — Inventario** | H4a: stock simple por producto (bebidas) descontado al cobrar. H4b: recetas, insumos, compras, mermas | 9 | Objetivo 3 |

🔧 La idempotencia (Doc. 07 §5) se adelanta a H0: desde H1 el mozo envía comandas por red inestable, y un reintento no puede duplicar una comanda ni un cobro.

🔧 H4a puede adelantarse a H3 si el piloto lo necesita antes; no depende de la facturación.

---

## 3. Estrategia de reactividad (objetivo 1)

1. **UI optimista:** el plato aparece en la orden al tocarlo; se confirma en segundo plano y se revierte con aviso si falla.
2. **Carta en el dispositivo:** se descarga una vez (React Query, invalidada por evento `CartaActualizada`); tomar un pedido no consulta al servidor por cada plato.
3. **Pantallas operativas como componentes de cliente:** mozo, KDS y caja llaman a la API directamente con React Query, sin pasar por server actions de Next (un salto menos por operación).
4. **WebSockets con Laravel Reverb** (Doc. 05 §5) con los canales privados del Doc. 08 §8. Sin polling.
5. **El WebSocket no es fuente de verdad:** los eventos llevan IDs y datos mínimos; al reconectar, el cliente vuelve a pedir el estado. Un mensaje perdido nunca es un pedido perdido.
6. **Bloqueo optimista** con `pedidos.version` (409 `CONFLICTO_VERSION` si dos mozos editan la misma mesa a la vez).
7. **Emisión directa:** los eventos de salón y cocina usan `ShouldBroadcastNow` (o un worker dedicado con `--sleep=0`). El driver de cola `database` con su espera por defecto (~3 s) rompe el objetivo de < 1 s.

---

## 4. Capacidad de Reverb

### 4.1 Estimación para 500 sucursales

| Concepto | Por sucursal (hora punta) | 500 sucursales |
|---|---|---|
| Dispositivos conectados (mozos, KDS, caja) | 6 – 10 | **3 000 – 5 000 conexiones** |
| Eventos | 2 – 5 / min | 40 – 80 msg/s en pico |
| Memoria | decenas de KB por conexión | 200 – 500 MB |

Una sola instancia de Reverb (2 vCPU, 2–4 GB) cubre este escenario sin Redis.

### 4.2 Condiciones obligatorias en producción

| Tema | Configuración |
|---|---|
| Límite de 1 024 conexiones de `stream_select` | Instalar **`ext-uv`**; `ulimit -n` ≥ 10 000 para el proceso de Reverb |
| Proceso | Supervisor con reinicio automático; `reverb:restart` en cada despliegue |
| Nginx | Cabeceras `Upgrade`/`Connection`, `proxy_read_timeout` ≥ 60 s |
| Reconexión | Backoff exponencial con *jitter* en el cliente (evita la tormenta tras un despliegue) |
| `/broadcasting/auth` | Liviano: token + inquilino + sucursal vía `rol_usuario`, sin consultas pesadas |
| Escalado | > 5 000–10 000 conexiones o alta disponibilidad → varias instancias + Redis pub/sub (mismo punto previsto en el Doc. 01 §3.6) |
| Degradación | Si Reverb cae, la app sigue operando por API y refresca al reconectar |

### 4.3 Alternativas descartadas
- **Polling:** ~2 500 req/s contra Laravel y PostgreSQL con 5 000 dispositivos, y aún 2 s de retraso.
- **SSE sobre PHP-FPM:** cada conexión retiene un worker de PHP.
- **Pusher/Ably:** viable pero costoso a esta escala y saca datos a un tercero. Reverb habla el mismo protocolo: migrar no toca el frontend.

---

## 5. Pruebas de producción

Ningún hito se da por cerrado sin sus pruebas. Se dividen en cuatro niveles.

### 5.1 Pruebas automatizadas (CI, en cada cambio)

Corren con `php artisan test` contra `factura_softfly_test` con RLS real (rol sin `BYPASSRLS`).

| Área | Prueba | Hito |
|---|---|---|
| Aislamiento | Toda tabla nueva con `inquilino_id` tiene política RLS y un test que intenta leerla desde otro inquilino (debe devolver 0 filas / 404) | Todos |
| Aislamiento | Un usuario de la sucursal A no puede suscribirse al canal `sucursal.{B}.*` (auth de broadcasting → 403) | H1 |
| Arquitectura | `ArchitectureTest`: el Core no usa `App\Modules`; `Domain` no depende de Laravel | Todos |
| Carta | CRUD con permisos `productos.*`; modificadores con selección mínima/máxima válida | H0 |
| Idempotencia | Mismo `Idempotency-Key` dos veces → una sola fila creada y la misma respuesta/HTTP | H0 |
| Pedidos | Una mesa no puede estar en dos pedidos abiertos (`pedido_mesa` UNIQUE parcial), incluso con dos transacciones concurrentes | H1 |
| Pedidos | Bloqueo optimista: versión vieja → 409 | H1 |
| Pedidos | Platos de cocina y bar en un envío → dos comandas; plato enviado no se borra, se anula con motivo | H1 |
| Eventos | `Event::fake()`/`Broadcast` verifica que cada acción emite el evento correcto en el canal correcto y sin datos de otro inquilino | H1 |
| Cobro | División de cuenta: la suma de ventas = total del pedido; no se cobra dos veces el mismo detalle | H2 |
| Caja | Arqueo: esperado = apertura + pagos en efectivo + ingresos − egresos | H2 |
| Facturación | Cálculo de IGV (18 % y tasa reducida 10.5 %), redondeo por línea y total; correlativo sin huecos por serie bajo concurrencia | H3 |
| Facturación | Job de envío: SUNAT caído → `PENDIENTE_ENVIO` y reintento con backoff; la venta se completa igual | H3 |
| Facturación | XML firmado validado contra el entorno beta de SUNAT (pruebas de integración, no en cada commit) | H3 |
| Inventario | Venta descuenta stock; anulación de plato enviado registra `MERMA`; existencias = suma del kardex | H4 |

### 5.2 Pruebas de carga (antes de abrir a clientes y en cada cambio de infraestructura)

Herramienta sugerida: **k6** (con su módulo WebSocket) o Artillery.

| Escenario | Carga | Umbral para aprobar |
|---|---|---|
| Conexiones concurrentes Reverb | Subir hasta 5 000 conexiones sostenidas 30 min | 0 conexiones rechazadas; memoria estable (sin fuga) |
| Latencia de punta a punta | 500 sucursales simuladas enviando 5 comandas/min | Comanda en el KDS **p95 < 1 s**, p99 < 2 s |
| Tormenta de reconexión | Reiniciar Reverb con 5 000 clientes conectados | 100 % reconectados en < 60 s; `/broadcasting/auth` sin errores 5xx |
| API de pedidos | 100 req/s mixtas (agregar plato, enviar comanda, cobrar) | p95 < 200 ms; 0 errores 5xx |
| Pico de almuerzo | 3× la carga normal durante 15 min | Sin degradación de la venta; la cola de SUNAT puede atrasarse, la venta no |

### 5.3 Pruebas de resiliencia (caos controlado, en staging)

| Falla provocada | Resultado esperado |
|---|---|
| Matar el proceso de Reverb | Supervisor lo levanta en < 5 s; los clientes reconectan y re-sincronizan; ningún pedido perdido |
| SUNAT/OSE no responde o responde lento | Ventas y boletas siguen saliendo; comprobantes en `PENDIENTE_ENVIO`; se envían al volver |
| Cortar la red del dispositivo del mozo en pleno envío | Al reconectar, el reintento con la misma `Idempotency-Key` no duplica la comanda |
| Dos mozos editan la misma mesa a la vez | Uno gana; el otro recibe 409 y la UI recarga el pedido sin perder lo que tecleó |
| Reiniciar PostgreSQL | La API responde 503 controlado y se recupera sola; ningún dato a medias (transacciones) |
| Despliegue en hora punta | Sin pérdida de pedidos; reconexión con *jitter* |

### 5.4 Prueba piloto (aceptación con el cliente)

Antes de vender a otro restaurante:
1. Un servicio completo (almuerzo) en el local piloto con mozos reales.
2. Medir: tiempo desde "tocar plato" hasta "aparece en cocina", errores percibidos, comandas perdidas (meta: 0).
3. Cierre de caja del día cuadrado sin intervención manual.
4. Todas las boletas del día aceptadas por SUNAT (o pendientes explicadas).
5. Stock de bebidas del sistema = conteo físico al cierre.

### 5.5 Monitoreo en producción (lo que se observa todos los días)

| Métrica | Alerta |
|---|---|
| Conexiones activas de Reverb | > 80 % de la capacidad probada |
| Latencia de broadcast (evento emitido → recibido) | p95 > 1 s durante 5 min |
| Comprobantes en `PENDIENTE_ENVIO` con más de 1 h | > 0 |
| Jobs fallidos | > 0 en cola de revisión manual |
| Errores 5xx de la API | > 1 % en 5 min |
| Proceso de Reverb reiniciado | Cualquier reinicio fuera de un despliegue |

---

## 6. Decisiones pendientes con el cliente piloto

| Decisión | Opción por defecto (si no se define) |
|---|---|
| Dispositivo del mozo | Celular con navegador (web responsive / PWA) |
| Cocina | Pantalla KDS; impresora térmica + agente local (Doc. 05 §6) en Fase 2 |
| ¿Stock simple antes que facturación? | No: H3 antes que H4a, salvo pedido explícito |

---

## 7. Próximo paso

Implementar H0: API y pantallas de carta, editor de plano básico, `claves_idempotencia` e instalación de Reverb, React Query y Zod.
