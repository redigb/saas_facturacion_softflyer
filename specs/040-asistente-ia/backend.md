# 040 — Backend

## Módulo

`back-softflyer/app/Modules/Assistant/` — sin migraciones (solo lectura).

| Archivo | Rol |
|---|---|
| `Application/AskAssistant.php` | Orquesta pregunta → acción → validación → consulta → respuesta y métricas |
| `Application/AssistantActions.php` | Declaraciones para Gemini y ejecución de las 4 acciones |
| `Application/AssistantPeriod.php` | Rangos `hoy/semana/mes/anio` en `America/Lima` y períodos anteriores |
| `Application/Contracts/AssistantModel.php` | Interfaz del proveedor (permite cambiar de modelo) |
| `Infrastructure/Gemini/GeminiAssistantModel.php` | HTTP a Gemini |
| `Infrastructure/AssistantServiceProvider.php` | Bind del proveedor y rate limiter |
| `Presentation/Controllers/AssistantController.php` | Validación del mensaje y respuesta |
| `Presentation/routes.php` | Ruta del chat |

## Contrato

`POST /api/v1/asistente/chat` — `inquilino`, `auth:sanctum`, `cuenta.vigente`,
`permiso:reportes.ventas`, `throttle:asistente`.

```json
{ "mensaje": "¿Cuánto vendí esta semana?" }
```

```json
{
  "data": {
    "respuesta": "En 26 oct – 1 nov 2026 vendiste S/ 3450.00 en 28 cuentas (ticket promedio S/ 123.21). Se vendieron 210 platos.",
    "accion": "consultar_ventas",
    "periodo": { "desde": "2026-10-26", "hasta": "2026-11-01", "etiqueta": "26 oct – 1 nov 2026" },
    "visualizacion": {
      "tipo": "barras",
      "titulo": "Ventas por día",
      "moneda": "PEN",
      "puntos": [{ "etiqueta": "26/10", "valor": "820.00" }]
    },
    "sugerencias": ["Compara esta semana con la anterior", "Productos más vendidos de este mes"]
  }
}
```

Visualizaciones: `metric` (`valor`), `barras` (`puntos[]`), `comparacion`
(`actual`, `anterior`, `variacion_pct`) y `lista` (`items[]`). Todas opcionales y tipadas.

## Acciones y datos

| Acción | Argumentos | Consulta |
|---|---|---|
| `consultar_ventas` | `periodo` (hoy/ayer/semana/semana_pasada/mes/mes_pasado/anio), `sucursal_id?` | `ventas` EMITIDA + `detalle_ventas` |
| `comparar_ventas` | `periodo` (hoy/ayer/semana/mes/anio), `comparar_con` (anterior/anio_pasado), `sucursal_id?` | Totales actuales vs anteriores |
| `productos_mas_vendidos` | `periodo`, `limite` 1–10, `metrica` unidades/importe, `sucursal_id?` | `detalle_ventas` + `productos` |
| `ventas_por_hora` | `periodo`, `sucursal_id?` | Ventas agrupadas por hora en `America/Lima` |
| `rendimiento_meseros` | `periodo`, `sucursal_id?` | Ventas atribuidas al mozo de cada pedido (`pedidos.mozo_id`) |
| `recomendaciones` | `periodo` (por defecto `semana`), `sucursal_id?` | Combina tendencia, plato estrella, hora punta y stock bajo |
| `consultar_stock_bajo` | `sucursal_id?`, `limite` 1–20 | `existencias` (`stock_minimo > 0 AND cantidad <= stock_minimo`) + `almacenes` |
| `resumen_stock` | `sucursal_id?` | Conteo de artículos bajo mínimo, sobre mínimo y sin mínimo, con los más críticos |

`recomendaciones` es determinista: reglas sobre la variación de ventas (baja ≥10 %, sube ≥10 %,
estable), el plato más vendido, la hora con más ingresos y los productos bajo mínimo. No deja que el
modelo invente consejos ni cifras.

## Charla local y fuera de tema (0 tokens)

Antes de llamar a Gemini, `AskAssistant` clasifica el mensaje en el servidor:

| Caso | Respuesta | ¿Llama a Gemini? |
|---|---|---|
| Pregunta de negocio (ventas, productos, stock, horas, recomendaciones…) | Herramienta + datos reales | Sí |
| Saludo, despedida, gracias, «¿qué puedes hacer?» | Texto local con emojis y el nombre del usuario | **No** |
| Cualquier otro tema (deportes, poesía, clima…) | Rechazo amable: solo ayuda con el restaurante | **No** |

Así, las respuestas sociales y el rechazo de temas ajenos no consumen tokens. El texto del modelo
solo se acepta en mensajes de negocio si no contiene cifras; si intenta responder con números
inventados, se ignora y se devuelve la guía segura.

Acciones de respuesta sin datos: `conversacion` y `fuera_de_tema`, ambas con
`periodo: null`, `visualizacion: null` y sugerencias.

Reglas de seguridad:
- Se ignoran ids de inquilino/restaurante enviados por el cliente o por el modelo.
- Siempre se filtra por `$user->branches()`; un `sucursal_id` ajeno responde `422 ASISTENTE_SUCURSAL_INVALIDA`.
- Stock: sin `inventario.administrar`, se limita a los almacenes de las estaciones KDS del usuario.
- Solo acciones de la lista; argumentos con claves inesperadas → `422 ASISTENTE_ARGUMENTOS_INVALIDOS`.
- Límites: mensaje 500 caracteres, top platos 10, stock 20, rangos predefinidos.

## Gemini

- Modelo por defecto **`gemini-3.5-flash-lite`** (configurable con `GEMINI_MODEL`). Los modelos 2.5 ya no están disponibles para claves nuevas; el cliente mantiene soporte de su formato por si se usa `GEMINI_API_STYLE=generate_content`.
- 2.x usa `POST {endpoint}/models/{model}:generateContent`; 3.x usa
  `POST {endpoint}/interactions`. El estilo se elige solo con `GEMINI_API_STYLE=auto`.
- Payload mínimo: instrucciones, fecha de Perú y pregunta. `store:false`; sin filas, precios,
  clientes ni credenciales.
- Parser defensivo: `candidates[0].content.parts[].functionCall` y `steps[].function_call`.
- Sin key → `503 ASISTENTE_NO_CONFIGURADO`; timeout/5xx/JSON inválido → `502 ASISTENTE_NO_DISPONIBLE`,
  sin exponer el cuerpo del proveedor. Crédito de prepago agotado o cuota del proveedor (402/429) →
  `503 ASISTENTE_SIN_CREDITO` con un mensaje que invita a revisar la facturación.

## Límites y métricas

- Rate limiter `asistente`: 15/min y 150/día por `usuario|host`.
- Log `asistente.consulta` con `inquilino_id`, `usuario_id`, `accion`, `ok`, `ms`. Nunca la pregunta ni resultados.

## Tareas

- [x] Config, provider, interfaz y cliente Gemini (2.x y 3.x).
- [x] Períodos en hora de Perú.
- [x] Cuatro acciones con permisos, sucursal y almacenes.
- [x] Respuestas deterministas y visualizaciones.
- [x] Ruta, validación, rate limit y errores.
- [x] Pruebas con Gemini falso.
