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
| [002-carta](002-carta/spec.md) | H0 | ✅ | 🟡 | **Abierta** |

Siguientes (sin abrir todavía): editor de plano → Reverb. Luego H1: pedidos en tiempo real.
