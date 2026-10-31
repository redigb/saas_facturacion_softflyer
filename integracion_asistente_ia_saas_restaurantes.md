# Integración del asistente de IA para el SaaS de restaurantes

## Objetivo

Integrar en el SaaS un asistente conversacional que permita a los usuarios consultar información de su restaurante en lenguaje natural, por ejemplo:

- «¿Cuánto vendí hoy?»
- «Compara las ventas de esta semana con las de la semana pasada».
- «¿Cuáles fueron mis productos más vendidos este mes?»
- «¿Qué productos tienen poco stock?»

La función debe responder con información calculada a partir de los datos reales del restaurante autenticado. La IA no debe inventar cifras ni acceder directamente y sin restricciones a la base de datos.

## Decisiones de arquitectura

- **Sin n8n en esta primera versión.**
- Backend existente (se ha considerado **FastAPI**; inspeccionar el repositorio y respetar la arquitectura real).
- Base de datos existente (se ha considerado **PostgreSQL**; inspeccionar el repositorio).
- Modelo externo mediante la **Gemini API de Google**, empezando con un modelo Flash-Lite disponible en el proyecto. Verificar el nombre exacto del modelo y sus precios/condiciones actuales antes de configurarlo; no fijar un identificador obsoleto en el código.
- El frontend del SaaS incorpora una interfaz de chat integrada.
- La API key de Google se almacena únicamente en variables de entorno del backend, nunca en React, el navegador, el repositorio ni los logs.
- No instalar ni ejecutar un modelo de IA local en el VPS.
- No integrar otro proveedor de IA en esta etapa; dejar la implementación suficientemente modular para evaluar otros modelos más adelante.

## Flujo esperado

1. El usuario autenticado escribe una pregunta en el asistente.
2. El frontend envía la pregunta al backend usando la sesión/token ya existente.
3. El backend autentica al usuario y obtiene de la sesión los identificadores de tenant/restaurante y los permisos. **No confiar en un `restaurant_id` enviado libremente por el cliente ni en los argumentos devueltos por el modelo.**
4. El backend envía a Gemini una instrucción breve, la pregunta y la lista de herramientas/acciones permitidas. No enviar toda la base de datos ni información personal innecesaria.
5. Gemini selecciona una acción permitida y devuelve argumentos estructurados.
6. El backend valida estrictamente la acción y sus argumentos, comprueba los permisos y ejecuta una función interna controlada.
7. La función consulta PostgreSQL con consultas parametrizadas y siempre aplica el filtro del restaurante/tenant autorizado.
8. El backend entrega a Gemini solo el resultado agregado necesario para redactar una respuesta clara, o construye la respuesta directamente si no se necesita otra llamada.
9. El backend devuelve una respuesta estructurada al frontend. Si hay datos apropiados para un gráfico, incluir una estructura de datos segura y tipada para que el frontend lo represente.

## Seguridad: requisitos obligatorios

- La IA **no puede ejecutar SQL arbitrario**.
- No concatenar entradas del usuario en consultas SQL.
- No confiar en que el modelo aplique permisos o aislamiento entre restaurantes.
- El backend debe aplicar autenticación, autorización y aislamiento multi-tenant en cada función.
- Usar una lista explícita de acciones permitidas; rechazar acciones desconocidas y argumentos inesperados.
- Limitar rangos de fechas, cantidad de resultados, tamaño de pregunta y tamaño del contexto.
- No enviar contraseñas, tokens, datos de tarjetas, datos personales innecesarios ni credenciales a Gemini.
- No incluir la API key ni datos sensibles en logs, mensajes de error o respuestas al cliente.
- Manejar errores, timeouts, límites de solicitudes y respuestas inválidas del proveedor sin exponer detalles internos.
- Aplicar rate limiting por usuario/restaurante y establecer límites de consumo para evitar abuso.
- Usar consultas de solo lectura para este asistente inicial. No permitir modificar precios, ventas, inventario ni pedidos mediante lenguaje natural.
- Registrar métricas de uso sin guardar indiscriminadamente preguntas o resultados sensibles.
- Revisar la política de datos y condiciones de la API elegida antes de usar datos comerciales reales. Desarrollar primero con datos ficticios.

## Acciones iniciales permitidas

Implementar solo las acciones que el esquema actual permita respaldar con datos fiables:

1. `consultar_ventas`: ventas agregadas por día, semana o mes.
2. `comparar_ventas`: comparación de dos períodos definidos y validados.
3. `productos_mas_vendidos`: productos ordenados por unidades o importe en un período.
4. `consultar_stock_bajo`: productos por debajo del umbral de stock configurado, si el sistema ya maneja ese dato.

Antes de implementar cada acción, inspeccionar el esquema de la base de datos y las reglas de negocio existentes. No inventar tablas, columnas, estados ni fórmulas. Si faltan datos o una función no existe, documentarlo y no simular resultados.

## API propuesta

Adaptar las rutas y convenciones al proyecto actual. Como referencia, se puede implementar un endpoint autenticado como:

`POST /api/assistant/chat`

Solicitud de ejemplo:

```json
{
  "message": "¿Cuánto vendí esta semana?"
}
```

Respuesta de ejemplo (datos ilustrativos; adaptar al contrato real del proyecto):

```json
{
  "answer": "Las ventas registradas en el período consultado suman S/ 3450.00.",
  "visualization": {
    "type": "metric",
    "title": "Ventas de la semana",
    "value": 3450.00,
    "currency": "PEN"
  }
}
```

No copiar este ejemplo como resultado real. Las cifras deben proceder de una consulta real y autorizada. Definir modelos de solicitud/respuesta tipados y documentar los errores esperados.

## Interfaz de usuario

- Añadir un acceso visible al «Asistente» dentro del SaaS, respetando el diseño y los componentes ya existentes.
- Permitir enviar una pregunta y mostrar estados de carga, respuesta, error y reintento.
- Añadir sugerencias iniciales, por ejemplo: «Ventas de hoy», «Comparar esta semana» y «Productos con poco stock».
- Mostrar las fechas/período utilizado cuando corresponda.
- Mostrar visualizaciones solo cuando el backend devuelva datos tipados y válidos.
- No mostrar resultados ficticios en producción.
- Mantener accesibilidad, diseño responsive y el sistema de autenticación actual.
- Evitar que una respuesta de la IA se interprete como una acción ejecutable o como una garantía contable.

## Configuración

Añadir al archivo de ejemplo de entorno, sin secretos reales, una variable como:

`GEMINI_API_KEY=`

Y una variable configurable para el modelo, por ejemplo:

`GEMINI_MODEL=`

El agente debe comprobar la documentación actual de Gemini API y configurar el nombre de modelo vigente que soporte las capacidades requeridas. No exponer estas variables en el frontend.

## Rendimiento y costos

- La inferencia ocurre en Google, no en el VPS; el backend consume recursos para validar, consultar la base de datos y manejar las solicitudes.
- Usar timeouts, límites de tokens y límites de frecuencia.
- Mantener los prompts concisos y enviar únicamente datos agregados necesarios.
- Evitar consultas SQL costosas y rangos de fechas ilimitados.
- Reutilizar índices existentes y revisar el plan de consultas cuando sea necesario.
- No almacenar respuestas en caché entre restaurantes. Cualquier caché debe incluir claves de aislamiento tenant y criterios de invalidación correctos.
- Medir latencia, errores, uso de tokens y costo estimado por restaurante.
- No prometer que el VPS soporta una cantidad concreta de usuarios simultáneos sin pruebas de carga.
- No incorporar n8n ni colas de trabajo salvo que una necesidad comprobada lo justifique.

## Plan de implementación para el agente

1. **Inspeccionar el repositorio**: estructura, framework, autenticación, multi-tenancy, modelos, esquema de base de datos, convenciones de API, componentes UI y pruebas.
2. **Informar hallazgos brevemente** antes de hacer cambios importantes. No reescribir ni reemplazar tecnologías existentes sin necesidad.
3. **Diseñar el contrato** del endpoint, las acciones permitidas y los modelos de datos a partir del esquema real.
4. **Implementar el backend** con integración segura de Gemini, validación estricta y consultas parametrizadas.
5. **Implementar la interfaz** usando los patrones visuales y de estado existentes.
6. **Añadir pruebas** unitarias e integración para:
   - autenticación y permisos;
   - aislamiento entre restaurantes;
   - argumentos inválidos o acciones no permitidas;
   - consultas sin datos;
   - fechas inválidas y rangos excesivos;
   - errores/timeouts de Gemini;
   - límites de uso;
   - respuestas estructuradas y visualizaciones;
   - protección frente a inyección SQL e instrucciones maliciosas.
7. **Actualizar la documentación** y el archivo de variables de entorno de ejemplo.
8. **Ejecutar las pruebas existentes** y las nuevas; informar qué pasó y qué no pudo verificarse.
9. No desplegar a producción, ejecutar migraciones destructivas ni alterar datos reales sin autorización explícita.

## Criterios de aceptación

- Un usuario autenticado puede preguntar por ventas y obtener cifras calculadas desde la base de datos real.
- El asistente no puede leer datos de otro restaurante aunque el usuario manipule la solicitud o el modelo devuelva argumentos maliciosos.
- No hay ejecución de SQL arbitrario.
- La clave de Gemini no aparece en el frontend ni en el repositorio.
- Se manejan con claridad los errores del proveedor y los límites de uso.
- El frontend funciona en escritorio y móvil y respeta el diseño actual.
- Las respuestas numéricas indican el período consultado y usan datos reales.
- Las pruebas automatizadas relevantes pasan, o se documentan claramente las limitaciones.

## Instrucción final al agente

Primero analiza el proyecto existente y después implementa la solución siguiendo sus convenciones. No inventes tablas, endpoints, funcionalidades ni reglas comerciales. Si el repositorio difiere de la arquitectura descrita, adapta el plan a lo que ya existe y explica las decisiones. Prioriza seguridad multi-tenant, exactitud de los datos, simplicidad y costos bajos. No añadas n8n en esta etapa.
