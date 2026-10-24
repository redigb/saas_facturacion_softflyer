# 029 — Backend

## Contrato

No se agregan endpoints. Las respuestas de KDS de la spec 007 incorporan:

| Campo | Tipo | Nota |
|---|---|---|
| `es_agregado` | boolean | `true` cuando antes de este envío el pedido ya tenía al menos una comanda |

Aplica a `GET /api/v1/cocina/comandas`, `PATCH /api/v1/cocina/detalles/{detalle}`, `POST /api/v1/cocina/comandas/{comanda}/listo` y `POST /api/v1/cocina/comandas/{comanda}/impresa`.

## Decisiones

- La marca se guarda en `comandas.es_agregado`; no se infiere de `numero`, porque un agregado puede ser la primera comanda enviada a una estación.
- Todas las comandas por estación creadas en el primer envío son iniciales. Todas las comandas creadas en un envío posterior son agregados.
- La comprobación ocurre con el pedido bloqueado dentro de la transacción existente, por lo que dos envíos simultáneos no pueden quedar ambos como iniciales.

## Tareas

- [x] Migración y cast de `comandas.es_agregado`.
- [x] Marcar la comanda al enviar y exponer el campo en el KDS.
- [x] Probar primera tanda y agregado posterior.
- [x] Pruebas en verde (`php artisan test`).
