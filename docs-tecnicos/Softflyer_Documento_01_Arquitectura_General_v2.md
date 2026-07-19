# Especificación Técnica — SaaS Facturación Softflyer
## Documento N.° 01 — Arquitectura General del Sistema (v2.0 — corregida)

**Proyecto:** SaaS Facturación Softflyer
**Estado:** Diseño Arquitectónico — revisado
**Tecnologías base:** Laravel 12 · Next.js · PostgreSQL

---

## Nota sobre esta revisión

Mantengo tu visión y la estructura general del documento original porque están bien orientadas: Core reutilizable + módulos verticales es el patrón correcto para este tipo de producto. Lo que hice fue **cerrar las decisiones que estaban abiertas o contradictorias**, porque un documento de arquitectura no puede dejar sin definir las cinco o seis decisiones que más impactan el proyecto. Señalo cada corrección con 🔧 y el motivo, para que veas el razonamiento, no solo el resultado.

---

## 1. Índice

1. Introducción y visión
2. Objetivos y alcance
3. Decisiones arquitectónicas clave (esto faltaba y es lo más importante)
4. Stack tecnológico
5. Arquitectura general
6. Arquitectura Multi-Tenant
7. Arquitectura modular y por capas
8. Organización del código
9. Modelo de datos (nivel conceptual)
10. Facturación electrónica (Perú)
11. Seguridad
12. Observabilidad
13. Rendimiento y escalabilidad
14. Infraestructura y entornos
15. Roadmap
16. Estándares de desarrollo

---

## 2. Introducción y visión

Softflyer es una plataforma ERP SaaS Multi-Tenant para el mercado peruano, compuesta por un **Core** de funcionalidades transversales (facturación, inventario, CRM, finanzas, reportes, IAM) y **módulos verticales** (Restaurante, Farmacia, Ferretería, Minimarket, Distribuidora, Hotel, Clínica, Centro de Acopio) que se apoyan sobre ese Core sin duplicar lógica.

Esto no cambia respecto a tu planteamiento original. Es el patrón correcto: si el Core está bien diseñado, cada módulo nuevo debería representar entre el 15% y 25% de trabajo adicional, nunca un rediseño.

---

## 3. Decisiones arquitectónicas clave

🔧 **Esta sección no existía en la versión anterior y es la parte más importante del documento.** Un documento de arquitectura que solo lista módulos y tecnologías, sin fijar postura en las decisiones que tienen consecuencias irreversibles, no sirve como guía real. Aquí quedan cerradas las seis decisiones que más afectan el resto del sistema.

### 3.1 Modelo de aislamiento Multi-Tenant

**Problema en la versión anterior:** decía "toda consulta deberá filtrar por `tenant_id`", pero eso es una *convención de código*, no una *garantía de seguridad*. Si un desarrollador olvida el `WHERE tenant_id = ?` en una sola consulta, una empresa puede ver datos de otra. En un sistema que maneja comprobantes tributarios, esto no es aceptable.

**Decisión:** Base de datos compartida (shared database, shared schema) con `tenant_id` en cada tabla, **reforzado con Row-Level Security (RLS) nativo de PostgreSQL**, no solo con `Global Scopes` de Eloquent.

- Eloquent Global Scopes se usan como primera capa (comodidad de desarrollo).
- RLS en PostgreSQL se usa como segunda capa obligatoria: aunque una query olvide el filtro, la base de datos rechaza el acceso a filas de otro tenant.
- Se descarta *schema-per-tenant* y *database-per-tenant* para la primera fase: con decenas o cientos de tenants pequeños (restaurantes, farmacias), el costo operativo de mantener miles de esquemas/bases no se justifica todavía. Se documenta como posible evolución para tenants "enterprise" grandes (cadenas, hoteles) más adelante, sin que esto rompa el diseño base.

**Consecuencia práctica:** cada migración debe crear la política RLS junto con la tabla, no como paso opcional posterior.

### 3.2 Patrón arquitectónico por módulo

**Problema en la versión anterior:** el documento mezclaba dos cosas incompatibles — decía "Clean Architecture" (capas `Application/Domain/Infrastructure/Presentation`) en la organización del código, pero luego en estándares de desarrollo decía "DDD ligero". Full Clean Architecture y DDD "ligero" no son el mismo nivel de rigor; si se documentan ambos como si fueran lo mismo, cada desarrollador lo va a interpretar distinto y el código del Core y el de los módulos van a divergir.

**Decisión:** se adopta **un único patrón, consistente para Core y para todos los módulos**: arquitectura por capas simplificada (no Clean Architecture completa, que es más apropiada para dominios muy complejos o con múltiples frameworks de entrada/salida):

```
Modulo/
├── Domain/        → Entidades y reglas de negocio puras, sin Eloquent
├── Application/    → Casos de uso (Services), orquestan Domain + Infrastructure
├── Infrastructure/ → Eloquent Models, Repositories, integraciones externas (SUNAT, etc.)
└── Presentation/   → Controllers, Requests, Resources (API)
```

Se elimina la referencia a "DDD ligero" como si fuera un patrón adicional: es simplemente el vocabulario (Entidad, Agregado, Repositorio) que ya usa esta misma estructura de capas. No son dos cosas.

### 3.3 Autenticación y autorización

**Problema en la versión anterior:** proponía Sanctum sin considerar que el roadmap incluye "API Pública" en la Fase 4. Sanctum está pensado para SPA de primera parte (mismo dominio/subdominio) y aplicaciones móviles propias; no está diseñado para terceros que integren su propio software contra la API de Softflyer.

**Decisión:**
- **Fase 1-3:** Laravel Sanctum para el frontend Next.js propio (SPA) y para tokens de aplicaciones móviles propias.
- **Fase 4 (API Pública):** se evalúa Laravel Passport u otro proveedor OAuth2 para emitir credenciales a integradores externos, sin reemplazar Sanctum (conviven: Sanctum para first-party, OAuth2 para third-party). Esto se deja anotado ahora para que el modelo de usuarios/roles no se diseñe de forma que luego haga incompatible esta extensión.

### 3.4 Procesamiento de la facturación electrónica: síncrono vs. asíncrono

**Problema en la versión anterior:** la sección de Facturación Electrónica listaba los elementos (XML, CDR, PDF, envío) pero no definía si el envío a SUNAT ocurre en el mismo request HTTP que genera la venta. Esto es importante: SUNAT/OSE pueden tardar varios segundos en responder o estar temporalmente no disponibles, y si el envío es síncrono, una venta en el POS del restaurante se quedaría "colgada" esperando a SUNAT.

**Decisión:** el flujo de emisión es **asíncrono**, vía colas (Laravel Queue, driver `database` en la primera fase, migrable a Redis/SQS sin cambiar lógica de negocio, tal como ya se planteaba para cache):

1. La venta se registra y el comprobante se genera localmente con estado `PENDIENTE_ENVIO`.
2. Un Job en cola firma el XML y lo envía a SUNAT/OSE.
3. Se actualiza el estado a `ACEPTADO`, `RECHAZADO` u `OBSERVADO` según el CDR recibido.
4. Reintentos automáticos con backoff ante fallas de conectividad, con un límite y una cola de revisión manual para casos persistentes.

Esto también resuelve un punto que el documento original no mencionaba: **el negocio debe poder seguir operando (imprimir la boleta, cobrar) aunque SUNAT esté lento o caído**, y el estado tributario se reconcilia después.

### 3.5 Gestión de certificados digitales por tenant

**Problema en la versión anterior:** "Certificados" aparecía en la lista de Billing sin especificar cómo se almacenan. Cada empresa (tenant) tiene su propio certificado digital para firmar comprobantes ante SUNAT; esto es información altamente sensible y **no puede vivir como un campo más en una tabla sin cifrar**.

**Decisión:** los certificados se almacenan cifrados en reposo (Laravel Encryption con llave propia por entorno, no la `APP_KEY` general reutilizada para todo), en una tabla separada con acceso restringido, y se documenta como candidato futuro a moverse a un servicio de secretos dedicado (p. ej. Vault) si el número de tenants crece significativamente.

### 3.6 Estrategia de caché sin Redis

Este punto ya estaba bien planteado en el original (abstracciones de Laravel, driver `array`/`database` en Fase 1, migración a Redis por configuración). Se mantiene sin cambios, solo se deja registrado aquí junto a las demás decisiones para que quede todo en un mismo lugar de referencia.

---

## 4. Objetivos técnicos

- Multi-tenant con aislamiento reforzado a nivel de base de datos (no solo aplicación).
- Modular: nuevos módulos verticales sin modificar el Core.
- Cumplimiento normativo SUNAT desde el diseño, no como capa añadida después.
- Operable con degradación aceptable ante fallas de servicios externos (SUNAT/OSE).
- Escalable horizontalmente sin cambios de arquitectura (solo de configuración/infraestructura).

## 5. Alcance por fases (resumen; detalle en sección 15)

- **Fase 1:** Core + Multi-Tenant + módulo Restaurante + Facturación Electrónica + Caja + Inventario.
- **Fase 2-4:** expansión modular (Farmacia, Ferretería, Minimarket, Distribuidora, Hotel, Clínica, Centro de Acopio) y API pública.

---

## 6. Stack tecnológico

**Backend:** PHP 8.4, Laravel 12, REST API, Sanctum (+ OAuth2 en Fase 4), Eloquent ORM.

**Frontend:** Next.js, React, TypeScript, TailwindCSS, React Query, React Hook Form, Zod.

**Base de datos:** PostgreSQL (con RLS habilitado para aislamiento multi-tenant).

**Infraestructura:** Docker, Nginx, GitHub, GitHub Actions.

**Cache/Queue/Session:** abstracciones de Laravel; driver `database`/`array` en Fase 1; Redis habilitable después por configuración, sin tocar lógica de negocio.

---

## 7. Arquitectura general

```
                        Usuarios
                            │
                   Next.js Frontend (SPA)
                            │
      ──────────────────────────────────────────
                     Laravel API (REST)
      ──────────────────────────────────────────
       Core (Multi-Tenant, IAM, Billing, Inventory,
             CRM, Finance, Reports)
       Modules (Restaurant, Pharmacy, Hotel, ...)
      ──────────────────────────────────────────
                 PostgreSQL (RLS activo)
                            │
              Cola de trabajos (envío SUNAT, notificaciones)
```

---

## 8. Arquitectura Multi-Tenant

Cada empresa es un Tenant. Cada Tenant tiene: empresa, sucursales, usuarios, clientes, productos, comprobantes, inventario, configuraciones y reportes propios.

Aislamiento en dos capas (ver decisión 3.1):
1. Global Scope de Eloquent por `tenant_id` (comodidad de desarrollo, no es la garantía de seguridad).
2. Row-Level Security en PostgreSQL (garantía real: la base de datos, no la aplicación, decide qué filas son visibles).

Los correlativos y series de comprobantes son por **sucursal**, no solo por tenant, porque así lo exige la normativa SUNAT (cada punto de emisión tiene su propia numeración).

---

## 9. Arquitectura modular y por capas

Ver decisión 3.2. Un único patrón de capas para Core y Modules:

```
app/
├── Core/
│   ├── Domain/
│   ├── Application/
│   ├── Infrastructure/
│   └── Presentation/
├── Modules/
│   ├── Restaurant/{Domain,Application,Infrastructure,Presentation}
│   ├── Pharmacy/{Domain,Application,Infrastructure,Presentation}
│   └── ...
└── Shared/        → utilidades transversales sin lógica de negocio
```

Un módulo puede depender del Core; el Core **nunca** depende de un módulo. Esta regla de dependencia es la que garantiza que agregar Hotel o Clínica no obligue a tocar Billing o Inventory.

---

## 10. Modelo de datos (nivel conceptual)

Jerarquía organizacional:

```
Tenant → Empresa → Sucursal → Usuario → Rol → Permiso
```

Entidades operativas del Core (todas con `tenant_id` + RLS):

```
Clientes, Proveedores, Productos, Categorías, Marcas, Almacenes,
Stock, Kardex, Cajas, Movimientos de Caja, Ventas, Compras,
Comprobantes (Boleta/Factura/NC/ND), Pagos, Series, Correlativos
```

Entidades específicas de módulo (ejemplo Restaurante): Mesas, Salones, Pedidos, Comandas, Mozos.

El detalle completo (diagrama entidad-relación, índices, reglas de integridad, convenciones de nombres, políticas RLS por tabla) corresponde al **Documento N.° 02 — Modelo de Datos Maestro**, que debe elaborarse antes de escribir el primer módulo.

---

## 11. Facturación electrónica (Perú)

Comprobantes: Boleta, Factura, Nota de Crédito, Nota de Débito.

Integraciones previstas: SUNAT (SEE), OSE cuando el cliente lo requiera.

Flujo (ver decisión 3.4): generación local → cola de envío → firma XML → envío a SUNAT/OSE → recepción de CDR → actualización de estado → generación de PDF de representación impresa.

🔧 **Punto que faltaba:** la homologación ante SUNAT (certificación del sistema de emisión electrónica) es un trámite legal con tiempos propios, no una tarea de desarrollo. El roadmap de Fase 1 debe considerar este tiempo como una dependencia externa, no asumir que "Facturación Electrónica" se completa solo con código.

Catálogos a mantener actualizados: tipos de documento de identidad, tipos de comprobante, monedas, unidades de medida, impuestos (IGV y otros), motivos de NC/ND.

---

## 12. Seguridad

Sanctum (+ OAuth2 en Fase 4), HTTPS, hash Bcrypt/Argon2, rate limiting, roles y permisos, auditoría, logs, soft delete, cifrado de certificados digitales por tenant (ver 3.5), RLS como control de acceso a nivel de base de datos (ver 3.1).

---

## 13. Observabilidad

🔧 **Sección nueva.** El documento original no mencionaba cómo se detectan problemas en producción, algo indispensable en un sistema que procesa comprobantes tributarios y no puede fallar en silencio.

- Logs estructurados por tenant y por request (correlación mediante un `request_id`).
- Métricas mínimas desde Fase 1: comprobantes emitidos, comprobantes rechazados por SUNAT, tiempo de respuesta del envío, jobs fallidos en cola.
- Alertas ante acumulación de comprobantes en estado `PENDIENTE_ENVIO` por más de X minutos (indicaría problema con SUNAT/OSE o con el worker de colas).

---

## 14. Rendimiento y escalabilidad

Índices por `tenant_id` + columnas de búsqueda frecuente, paginación obligatoria en listados, optimización de consultas, cache preparada para Redis.

Escalamiento: 1 servidor Laravel → balanceador + múltiples instancias → Redis → PostgreSQL primario + réplicas de lectura. Ninguna de estas etapas requiere cambios en la lógica de negocio si las abstracciones de Laravel se respetan desde el inicio.

---

## 15. Infraestructura y entornos

🔧 **Se agrega lo que faltaba:** el documento original hablaba de Docker/Nginx/GitHub Actions pero no de entornos. Se definen tres entornos mínimos: `local` (Docker Compose), `staging` (réplica de producción para pruebas de integración con SUNAT en su ambiente de pruebas Beta), `production`. El ambiente Beta de SUNAT es obligatorio antes de homologar, y debe existir un entorno `staging` que apunte a él, separado de producción.

---

## 16. Roadmap

**Fase 1:** Core, Multi-Tenant con RLS, POS Restaurante, Caja, Inventario, Facturación Electrónica (incluye tiempo de homologación SUNAT como dependencia externa).

**Fase 2:** Delivery, Compras, Recetas, KDS, Fidelización.

**Fase 3:** Farmacias, Ferreterías, Minimarkets, Distribuidoras.

**Fase 4:** Hoteles, Clínicas, Centros de Acopio, API Pública (OAuth2).

---

## 17. Estándares de desarrollo

PSR-12 en PHP, TypeScript estricto en frontend, principios SOLID, Clean Code, arquitectura por capas consistente (ver 3.2, no "DDD ligero" como concepto aparte), Git Flow, API REST versionada (`/api/v1`), convenciones de nombres consistentes, pruebas unitarias e integración para procesos críticos (emisión de comprobantes, cálculo de impuestos, movimientos de caja).

---

## Próximo documento

**Documento N.° 02 — Modelo de Datos Maestro**, que ahora sí puede construirse sobre bases firmes porque las decisiones de aislamiento (RLS), procesamiento asíncrono y capas ya están cerradas: diagrama entidad-relación completo, entidades del Core y de Restaurante, políticas RLS por tabla, índices, reglas de integridad, convenciones de nombres y catálogos SUNAT.
