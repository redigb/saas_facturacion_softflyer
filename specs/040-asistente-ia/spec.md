# 040 — Asistente IA sobre los datos del restaurante

**Estado:** Lista para probar (2026-10-31)
**Backend:** ✅ · **Frontend:** ✅
**Hito:** Producto (asistente conversacional)
**Documentos:** `integracion_asistente_ia_saas_restaurantes.md` · Doc. 06 §5 · Doc. 07 §5

## Qué y por qué

El administrador puede preguntar en lenguaje natural por su operación:

- «¿Cuánto vendí hoy?»
- «Compara esta semana con la anterior»
- «¿Cuáles fueron mis productos más vendidos este mes?»
- «¿Qué productos tienen poco stock?»

La respuesta se calcula con datos reales del restaurante autenticado. El modelo **no ejecuta SQL**,
no inventa cifras y no puede leer otro restaurante: solo selecciona una de las cuatro acciones
permitidas y sus argumentos, y el backend valida y consulta.

## Criterios de aceptación

- [x] Endpoint autenticado `POST /asistente/chat` con el permiso `reportes.ventas`.
- [x] El inquilino, el usuario, la sucursal y los almacenes salen de la sesión; nunca del cliente ni del modelo.
- [x] Ocho acciones: ventas, comparación, top de productos, horas punta, rendimiento de meseros, recomendaciones, stock bajo y resumen de inventario.
- [x] Períodos entendidos en lenguaje natural: hoy, ayer, semana, semana pasada, mes, mes pasado y año.
- [x] Solo consultas de lectura con Query Builder parametrizado; sin SQL arbitrario.
- [x] Argumentos por enums y rangos acotados; acciones o argumentos desconocidos se rechazan antes de consultar.
- [x] Fechas en `America/Lima` y respuesta con el período consultado.
- [x] Respuesta redactada en el servidor a partir de la consulta; sin segunda llamada al modelo.
- [x] Visualizaciones tipadas (`metric`, `barras`, `comparacion`, `lista`) opcionales.
- [x] Rate limit 15/min y 150/día por usuario+restaurante.
- [x] La API key vive solo en el backend; nunca en el frontend, el repositorio ni los logs.
- [x] No se registran preguntas ni resultados en logs, solo métricas de uso.
- [x] Chat responsive con sugerencias, carga, error con reintento y aviso de que no es un cierre contable.
- [x] El acceso es un **globo flotante** en todas las pantallas del panel (desktop y móvil), no un ítem del menú.
- [x] Saludos, despedidas, agradecimientos y ayuda se responden localmente, con emojis, **sin llamar a Gemini**.
- [x] Las preguntas fuera del tema del restaurante se rechazan localmente, también **sin consumir tokens**.
- [x] Solo las preguntas de negocio llegan al modelo; una respuesta de texto del modelo nunca se usa para preguntas de datos.

## Fuera de alcance

- Escrituras por lenguaje natural (precios, ventas, inventario, pedidos).
- SQL libre, n8n, colas o modelos locales.
- Historial persistente de conversaciones o chat multi-turno con memoria.
- Rangos de fechas libres o consultas personalizadas fuera de los enums.
- Otros proveedores de IA (la interfaz `AssistantModel` queda lista para añadirlos).

## Verificación

- `php artisan test --filter=AssistantTest`: 17 pruebas en verde (autenticación, permisos, aislamiento,
  acciones, argumentos inválidos, errores del proveedor, rate limit, privacidad del prompt y logs).
- Regresión: 65 pruebas de los módulos de caja, pedidos, carta, promociones, analíticas e inventario en verde.
- `npx tsc --noEmit` y `npm run lint`: sin errores nuevos.
- Pendiente con clave real: recorrido manual de las cuatro preguntas y confirmación de la cuota de Gemini.
