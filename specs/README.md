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
| 014-inventario-simple | H4a | ⚪ | ⚪ | Planificada |
| 015-ventas-reportes | Config | ⚪ | ⚪ | Planificada |
| 016-preview-sistema | Cierre | ⚪ | ⚪ | Planificada |
| [017-facturacion-greenter](017-facturacion-greenter/spec.md) | H3 | ⚪ | ⚪ | Pendiente de diseño |

## Hoja de ruta: configuración general y preview

Objetivo: un sistema completo para mostrar al cliente, con **solo la facturación real (Greenter) pendiente**. Las specs 012–016 no tienen carpeta hasta que se abren (una a la vez).

| Spec | Entrega |
|---|---|
| 011 empresa y sucursales | `/panel/configuracion`: datos fiscales (RUC válido, razón social, dirección) y alta/edición de sucursales con su principal; respeta los límites del plan |
| 012 caja, series y cobro | Gestión de cajas y de series de comprobantes; métodos de pago activos por local; opciones de cobro |
| 013 accesos y perfil | Matriz de roles y permisos; "Mi perfil" (contraseña y PIN propio) |
| 014 inventario simple | Stock por producto, ajustes y movimientos, descuento al cobrar, alerta de stock bajo, pantalla Inventario |
| 015 ventas y reportes | "Hoy en tu local" real, historial de ventas y comprobantes, resúmenes por método, mozo y plato |
| 016 preview del sistema | Datos de demostración coherentes (ventas, turnos, comprobantes, stock), checklist del Inicio actualizado, recorrido guiado, QA de punta a punta |
| 017 facturación Greenter | Emisión real a SUNAT; pendiente de diseño (decisiones abiertas en su `spec.md`) |

Orden: 011 → 012 → 014 → 015 → 016, con 013 intercalable. La 017 queda al final.
