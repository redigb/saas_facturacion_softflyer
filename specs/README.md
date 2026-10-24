# Specs

Forma simple de trabajar por especificaciones, inspirada en [GitHub Spec Kit](https://github.com/github/spec-kit). Solo tomamos sus reglas, no sus herramientas.

Una spec es **una funcionalidad completa** para el usuario: cubre backend y frontend a la vez, para que los dos avancen coordinados.

## Archivos de cada spec

```text
NNN-nombre-corto/
├── spec.md       General: qué, por qué, criterios de aceptación y estado de cada lado
├── backend.md    Foco en el CONTRATO: endpoints, JSON, errores, permisos + tareas
└── frontend.md   Foco en la EXPERIENCIA: flujo, diseño, interactividad, estados + tareas
```

- **`backend.md` manda sobre el contrato.** El frontend consume exactamente lo que dice ahí. Si cualquiera de los dos necesita cambiarlo, primero se edita el contrato y después el código.
- **`frontend.md` manda sobre la experiencia.** Cómo se siente para el dueño, el mozo o el cajero: cuántos toques, qué ve mientras carga, qué pasa si falla, cómo se ve en celular.

## Reglas

1. **Primero la spec, después el código.** Nada se implementa sin una spec abierta.
2. **Una spec abierta a la vez.** Se cierra la actual y recién se abre la siguiente.
3. **El estado se lleva por lado** en `spec.md` y en el índice: ⚪ sin empezar · 🟡 en curso · ✅ listo · ➖ no aplica.
4. **El backend va primero dentro de la spec:** el frontend empieza cuando el contrato está implementado y probado (o, como mínimo, escrito y aceptado).
5. **Pequeña:** una spec cabe en pocos días. Si crece, se parte en dos.
6. **Basada en los documentos técnicos.** Se cita la sección que aplica (ej. *Doc. 07 §5*). Si contradice un documento, se decide explícitamente y se anota en el documento.
7. **Cerrar = los dos lados listos:** tareas marcadas, criterios verificados, `php artisan test` en verde y `npm run lint` + `npx tsc --noEmit` sin errores.
8. **Lo que no se hizo no se arrastra en silencio:** va a "Fuera de alcance" o a la siguiente spec.

Para crear una nueva, copia [`_plantilla/`](_plantilla/) con el siguiente número.

## Índice

| Spec | Hito (Doc. 09) | Backend | Frontend | Estado |
|---|---|---|---|---|
| [000-base-lotes-1-5](000-base-lotes-1-5/spec.md) | — | ✅ | ✅ | Cerrada |
| [001-idempotencia](001-idempotencia/spec.md) | H0 | ✅ | ➖ | Cerrada |
| [002-carta](002-carta/spec.md) | H0 | ✅ | ✅ | Cerrada |
| [003-plano](003-plano/spec.md) | H0 | ✅ | ✅ | Cerrada |
| [004-equipo](004-equipo/spec.md) | H0 | ✅ | ✅ | Cerrada |
| [005-tiempo-real](005-tiempo-real/spec.md) | H0 | ✅ | ✅ | Cerrada |
| [006-pedidos-mozo](006-pedidos-mozo/spec.md) | H1 | ✅ | ✅ | Cerrada |
| [007-cocina-kds](007-cocina-kds/spec.md) | H1 | ✅ | ✅ | Cerrada |
| [008-tiempo-real-eficiente](008-tiempo-real-eficiente/spec.md) | H1 | ✅ | ✅ | Cerrada |
| [009-caja-cobro](009-caja-cobro/spec.md) | H2 | ✅ | ✅ | Cerrada |
| [010-comprobante-simulado](010-comprobante-simulado/spec.md) | H3 (parcial) | ✅ | ✅ | Cerrada |
| [011-empresa-sucursales](011-empresa-sucursales/spec.md) | Config | ✅ | ✅ | Cerrada |
| 012-caja-series-cobro | Config | ⚪ | ⚪ | Planificada |
| 013-accesos-perfil | Config | ⚪ | ⚪ | Planificada |
| [014-inventario-integral](014-inventario-integral/spec.md) | H4 | ✅ | ✅ | Cerrada |
| 015-ventas-reportes | Config | ⚪ | ⚪ | Planificada |
| 016-preview-sistema | Cierre | ⚪ | ⚪ | Planificada |
| [017-facturacion-greenter](017-facturacion-greenter/spec.md) | H3 | ⚪ | ⚪ | Diseño cerrado (índice) |
| [017a-configuracion-fiscal](017a-configuracion-fiscal/spec.md) | H3 | ✅ | ✅ | Cerrada (2026-10-19) |
| [017b-emision-greenter](017b-emision-greenter/spec.md) | H3 | 🟡 | ⚪ | En curso: boleta y factura aceptadas en beta, reintentos automáticos. Pendiente de producción: consulta de CDR y 1033 (solo existen allí) |
| [017c-estado-operacion](017c-estado-operacion/spec.md) | H3 | ⚪ | ⚪ | Pendiente |
| [018-facturacion-suscripcion](018-facturacion-suscripcion/spec.md) | Backoffice | ⚪ | ⚪ | Diseño: Softflyer factura a sus clientes con el mismo motor |
| [018-plano-en-pedidos](018-plano-en-pedidos/spec.md) | H1 (mejora) | ➖ | ✅ | Cerrada |
| [019-pedidos-pulido](019-pedidos-pulido/spec.md) | H1 (ajustes) | ➖ | ✅ | Cerrada |
| [020-carta-y-pedidos](020-carta-y-pedidos/spec.md) | H1 (ajustes) | ✅ | ✅ | Cerrada |
| [021-carrito-y-observaciones](021-carrito-y-observaciones/spec.md) | H1 (ajustes) | ➖ | ✅ | Cerrada |
| [022-carrito-visible](022-carrito-visible/spec.md) | H1 (ajustes) | ➖ | ✅ | Cerrada |
| [023-fotos-de-platos](023-fotos-de-platos/spec.md) | H1 (mejora) | ✅ | ✅ | Cerrada |
| [024-vista-del-mozo](024-vista-del-mozo/spec.md) | H1 (mejora) | ➖ | ✅ | Cerrada |
| [025-mesas-con-dueno](025-mesas-con-dueno/spec.md) | H1 (regla de negocio) | ✅ | ✅ | Cerrada |
| [026-lupa-del-plato](026-lupa-del-plato/spec.md) | H1 (mejora) | ➖ | ✅ | Cerrada |
| [027-impresion-de-comandas](027-impresion-de-comandas/spec.md) | H1 (pedido por el negocio) | ✅ | ✅ | Cerrada |
| [028-agente-local-impresion](028-agente-local-impresion/spec.md) | H1 (Fase 2) | ⚪ | ⚪ | Pendiente de diseño |
| [029-comandas-agregadas](029-comandas-agregadas/spec.md) | H1 (mejora operativa) | ✅ | ✅ | Cerrada |
| [030-acceso-kds-por-estacion](030-acceso-kds-por-estacion/spec.md) | H1 (seguridad operativa) | ✅ | ✅ | Cerrada |
| [031-preparacion-recetas](031-preparacion-recetas/spec.md) | H4b (preparación) | ✅ | ✅ | Cerrada |
| [032-asistencia-geolocalizada](032-asistencia-geolocalizada/spec.md) | Personal (asistencia) | ✅ | ✅ | Cerrada |
| [033-panel-operativo-caja](033-panel-operativo-caja/spec.md) | H2 (mejora de Caja) | ✅ | ✅ | Cerrada |
| [034-ordenes-administrador](034-ordenes-administrador/spec.md) | H2 (mejora operativa) | ✅ | ✅ | Cerrada |

## Hoja de ruta: configuración general y preview

Objetivo: un sistema completo para mostrar al cliente, con **solo la facturación real (Greenter) pendiente**. Las specs 012–016 no tienen carpeta hasta que se abren (una a la vez).

| Spec | Entrega |
|---|---|
| 011 empresa y sucursales | `/panel/configuracion`: datos fiscales (RUC válido, razón social, dirección) y alta/edición de sucursales con su principal; respeta los límites del plan |
| 012 caja, series y cobro | Gestión de cajas y de series de comprobantes; métodos de pago activos por local; opciones de cobro |
| 013 accesos y perfil | Matriz de roles y permisos; "Mi perfil" (contraseña y PIN propio) |
| 014 inventario integral | Insumos, alimentos, bebidas y objetos/utensilios; conteos por Cocina y Barra, entradas, salidas, ajustes, mermas, stock bajo y kardex por almacén |
| 015 ventas y reportes | "Hoy en tu local" real, historial de ventas y comprobantes, resúmenes por método, mozo y plato |
| 016 preview del sistema | Datos de demostración coherentes (ventas, turnos, comprobantes, stock), checklist del Inicio actualizado, recorrido guiado, QA de punta a punta |
| 017 facturación Greenter | Emisión real a SUNAT; pendiente de diseño (decisiones abiertas en su `spec.md`) |

Orden: 011 → 012 → 014 → 015 → 016, con 013 intercalable. La 017 queda al final.

## Pendiente de verificar solo en SUNAT producción

- La consulta de CDR (`getStatusCdr`) y la respuesta 1033 no existen en beta (un reenvío allí se acepta de nuevo). Están probadas con un doble de SUNAT; confirmarlas con la primera empresa homologada (spec 017b).
- El servidor debe correr `php artisan schedule:run` cada minuto además del worker de cola.
- Las tasas reducidas (Ley 31556: 10 %) no están sembradas: cargarlas con sus vigencias exactas, validadas por un contador, antes de asignarlas a una sucursal. Lo mismo para quién califica a la exoneración de la Amazonía y si le corresponde la leyenda 2001 (bienes) o 2002 (servicios).

## Reservado para después (no se construye ahora)

- **Varios RUC por cliente (multi-RUC).** Hoy un cliente (inquilino) tiene una sola empresa. La salida más barata es un cliente por RUC y, encima, un grupo o cuenta que los agrupe en el backoffice. Decidir con un caso real. La base ya ayuda: las series se piden únicas por RUC, el IGV se resuelve por sucursal y todo lo fiscal cuelga de `empresas`, no del cliente.
- **Rubro por sucursal** (farmacia, ferretería, hotel…) y los módulos de cada rubro. Sin un cliente real de otro rubro, no hay qué diseñar.

## Backoffice: hoja de cierre

- [x] Ciclo de vida: crear, activar plan, extender prueba, suspender, reactivar.
- [x] Fiscal por cliente, alertas y "Probar credenciales" (spec 017b).
- [x] Editar los datos de la empresa (`PATCH plataforma/clientes/{slug}`): el RUC solo cambia sin comprobantes reales y retira la homologación.
- [x] Cancelar cliente (`POST plataforma/clientes/{slug}/cancelar`): pierde el acceso, se cierran sus sesiones, los datos se conservan. Se confirma escribiendo el subdominio.
- [ ] Soporte de usuarios del cliente: resetear contraseña y desactivar usuarios.
- [ ] Salud técnica: cola detenida y trabajos fallidos.
- [ ] Cobro de suscripciones: pagos, historial y recordatorio de renovación (requiere spec propia).
- [ ] Comprobantes de todos los clientes en una vista; equipo y roles del backoffice; filtros, historial y correo de alertas.

## Backoffice: cara propia (shadcn)

- El backoffice usa su propio tema (`front-next/src/styles/backoffice-theme.css`, `[data-theme="backoffice"]`, tema Discord del starter, oscuro por defecto, fuente Google Sans Flex local) y el layout de sidebar de [next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter). `<ThemeScope>` pone el tema en `<html>` porque los portales de Radix viven fuera del layout.
- Los componentes compartidos (`components/ui`) leen tokens de shadcn (`bg-primary`, `text-foreground`, `border-border`…); los valores por defecto son los de la marca, así que el restaurante se ve igual. Un módulo nuevo solo define su `[data-theme]`.
- Átomos: `components/ui`. Piezas del backoffice: `components/backoffice/{molecules,organisms,templates}`.
