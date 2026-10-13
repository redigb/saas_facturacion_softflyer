# 008 — Backend

## Contrato

### Autorización de canales en lote

`POST /api/v1/broadcasting/auth/lote` — subdominio del inquilino, `Authorization: Bearer`. Equivale a llamar `broadcasting/auth` (spec 005) una vez por canal, con las mismas reglas.

```json
{ "socket_id": "123.456", "canales": ["private-sucursal.1.salon", "private-sucursal.1.mozo.7"] }
```

Respuesta **200** con una entrada por canal pedido: la firma de Reverb o `null` si no está autorizado.

```json
{ "data": { "private-sucursal.1.salon": { "auth": "clave:firma" }, "private-sucursal.1.mozo.7": null } }
```

| Regla | Valor |
|---|---|
| `canales` | 1 a 20, cadenas únicas con prefijo `private-` |
| `socket_id` | requerido |
| Sin sesión | 401, como el resto de la API |

`POST /broadcasting/auth` (un canal) se mantiene sin cambios.

## Decisiones

- **Un canal denegado no tumba el lote:** devuelve `null` en su entrada; el cliente decide. Así una estación borrada no impide recibir el salón.
- **Mismas reglas, una sola consulta de sucursales:** `User::branches()` se memoiza por instancia (como `permissionCodes()`); un lote de N canales hace 1 consulta de sucursales, no N.
- Se reutiliza `Broadcast::auth` por canal: la firma y las reglas de `channels.php` no se duplican.

## Tareas

- [x] `User::branches()` memoizada por instancia
- [x] Ruta `broadcasting/auth/lote` con `inquilino` + `auth:sanctum`
- [x] Pruebas: lote permitido, canal ajeno → `null` sin afectar al resto, otro restaurante, sin sesión, más de 20 canales → 422
- [x] Pruebas en verde (`php artisan test`)

## Cierre del backend (2026-10-12)

- Código: `Core/Iam/Presentation/Controllers/ChannelAuthController`, ruta `broadcasting/auth/lote`, `User::branches()` memoizada.
- Pruebas: 2 casos nuevos en `RealtimeTest`. Suite: 104 en verde; los 8 que fallan son de RLS y ya fallaban antes porque `.env` local usa `DB_USERNAME=postgres` (superusuario salta RLS).
