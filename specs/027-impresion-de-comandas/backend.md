# 027 — Backend

## Contrato (nuevo)

| Método | Ruta | Permiso | Qué hace |
|---|---|---|---|
| POST | `/api/v1/cocina/comandas/{ticket}/impresa` | `restaurante.cocina.actualizar_estado` o `panel.ver` | Marca la comanda como impresa (primera vez gana) y devuelve la comanda |

### Cambio en las respuestas del KDS

`GET /cocina/comandas`, `PATCH /cocina/detalles/{item}` y `POST /cocina/comandas/{id}/listo` ahora incluyen en cada comanda:

| Campo | Tipo | Nota |
|---|---|---|
| `impresa_en` | ISO8601 ú o `null` | Marca de la primera impresión (o `null` si nunca se imprimió) |

### Errores

- **403** sin permiso (middleware `permiso:…`).
- **404** comanda de otro restaurante (búsqueda por inquilino).

## Decisiones

- **La primera marca gana**: reimprimir no mueve `impresa_en` (es «cuándo salió el papel por primera vez», como dice el Doc. 08). Con reimpresiones frecuentes, el histórico no pierde el dato original.
- **Sin evento de tiempo real**: imprimir no cambia el estado del plato; las otras pantallas de la estación no necesitan enterarse.
- **Sin precios** en la comanda (Doc. 08 §4), idéntico a la pantalla.
- `markPrinted` replica el guard de sucursal (`worksAt`) del resto del módulo.

## Tareas

- [ ] `KitchenBoard::markPrinted` (worksAt + primera vez gana)
- [ ] Ruta + `KitchenController::printed` + `impresa_en` en el presentador
- [ ] Pruebas: imprimir marca; reimprimir conserva; mozo 403; admin OK
- [ ] `php artisan test` en verde
