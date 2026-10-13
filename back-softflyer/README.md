# Softflyer API

API REST (Laravel 12) de **Softflyer**: un ERP SaaS multi-tenant para que los restaurantes peruanos tomen pedidos en tiempo real, cobren, controlen su stock y emitan boletas y facturas electrónicas SUNAT sin detener la venta.

## Propósito

El primer cliente piloto pidió tres cosas, y todo el trabajo se prioriza por ellas (Doc. 09 §1):

1. **Pedidos en tiempo real:** órdenes rápidas, sin latencia, con la cocina enterándose al instante.
2. **No facturar a mano:** al cobrar, el comprobante sale solo y SUNAT se resuelve en segundo plano.
3. **Control de stock:** saber cuánto queda y que se descuente al vender.

## Cómo trabajamos: por specs

Cada avance nace como una **spec** en [`../specs/`](../specs/) antes de escribir código. Una spec cubre backend y frontend: en `backend.md` el **contrato de la API** es lo que manda, y el frontend lo consume tal cual. Solo hay **una spec abierta a la vez**. Las reglas están en [`../specs/README.md`](../specs/README.md).

Las specs no reemplazan a los documentos técnicos: los aplican. La fuente de verdad sigue en [`../docs-tecnicos/`](../docs-tecnicos/).

## Arquitectura en una línea

```text
Next.js -> /api/v1 (Laravel) -> Core + Modules -> PostgreSQL con RLS
```

```text
app/
├── Core/        Tenancy, Iam, Sales, Billing, Inventory, Cash
├── Modules/     Restaurant (salón, mesas, pedidos, comandas)
├── Platform/    backoffice de la plataforma (admin.{dominio})
└── Shared/      utilidades sin lógica de negocio
```

Cada contexto usa las capas `Domain`, `Application`, `Infrastructure` y `Presentation`. Los módulos dependen del Core, nunca al revés (`tests/Unit/ArchitectureTest.php`). Detalle en [`../ARQUITECTURE.md`](../ARQUITECTURE.md).

## Arranque local

Requisitos: PHP 8.2+ con `pdo_pgsql`, Composer y PostgreSQL 17.

```powershell
# Una sola vez, como postgres: crea los roles softflyer_owner y softflyer_app
psql -h 127.0.0.1 -U postgres -v owner_pw="..." -v app_pw="..." -f database/setup/crear_bd_local.sql

copy .env.example .env   # completar DB_PASSWORD y DB_OWNER_PASSWORD
composer install
php artisan key:generate
php artisan migrate --database=pgsql_owner --seed


php artisan serve --host=127.0.0.1 --port=8000
php artisan reverb:start   # en otra terminal: tiempo real (ver la sección siguiente)
```

## Tiempo real (WebSockets con Reverb)

Las comandas que llegan solas a cocina, el aviso de "plato listo" al mozo y la carta o el plano que se actualizan sin recargar viajan por WebSocket con [Laravel Reverb](https://laravel.com/docs/reverb) (spec 005, Doc. 05 §5).

**Sin Reverb todo sigue funcionando**: se guarda y se envía igual, solo se pierden los avisos instantáneos. La cabecera del panel muestra "Reconectando…" y la pantalla de cocina se actualiza cada 15 s hasta que vuelva.

### 1. Configurar el backend (`.env`)

```dotenv
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=softflyer
REVERB_APP_KEY=        # clave pública: la comparte el frontend
REVERB_APP_SECRET=     # secreta: solo el backend
REVERB_HOST=127.0.0.1  # adónde publica Laravel los eventos
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080
REVERB_ALLOWED_ORIGINS=*
```

Para generar la clave y el secreto:

```powershell
php -r "echo bin2hex(random_bytes(10)), PHP_EOL, bin2hex(random_bytes(20)), PHP_EOL;"
```

La primera línea va en `REVERB_APP_KEY` y la segunda en `REVERB_APP_SECRET`.

### 2. Configurar el frontend (`front-next/.env.local`)

```dotenv
NEXT_PUBLIC_REVERB_KEY=   # el mismo valor que REVERB_APP_KEY
NEXT_PUBLIC_REVERB_HOST=  # vacío = el subdominio actual (donjose.localhost)
NEXT_PUBLIC_REVERB_PORT=8080
NEXT_PUBLIC_REVERB_SCHEME=http
```

Next lee las variables `NEXT_PUBLIC_*` al arrancar: **reinicia `npm run dev`** después de cambiarlas.

### 3. Arrancar

En una terminal aparte, desde `back-softflyer`, y dejarla abierta:

```powershell
php artisan reverb:start
```

Agrega `--debug` para ver en la consola cada conexión y cada mensaje.

### 4. Comprobar que funciona

- En la cabecera del panel, el indicador pasa a **"En vivo"** (punto verde).
- Abre **Cocina** en una pestaña y **Pedidos** en otra; al enviar un plato, la comanda aparece en cocina en menos de un segundo.
- Medición con clientes reales: `node ../tests/carga/latencia.js` (instrucciones dentro del archivo).

### Si no conecta

| Síntoma | Causa probable |
|---|---|
| "Conectando…" para siempre | Reverb no está corriendo, o `NEXT_PUBLIC_REVERB_KEY` no coincide con `REVERB_APP_KEY` (o no reiniciaste `npm run dev`) |
| `Address already in use` al arrancar | Otro proceso usa el puerto 8080: ciérralo o cambia `REVERB_PORT`/`REVERB_SERVER_PORT` y `NEXT_PUBLIC_REVERB_PORT` |
| El panel conecta pero no llega ningún aviso | `BROADCAST_CONNECTION` no es `reverb`, o `REVERB_HOST`/`REVERB_PORT` no apuntan a donde corre Reverb |
| 403 en `/api/broadcasting/auth` | El usuario no trabaja en esa sucursal o no tiene el permiso del canal (es lo esperado) |
| Guardar tarda ~1 s más de lo normal | Reverb está caído: Laravel espera como máximo 1 s para conectar y sigue sin el aviso (`config/broadcasting.php`) |

### Canales

Todos privados; se autorizan en `POST /api/v1/broadcasting/auth` con el inquilino del subdominio (`app/Modules/Restaurant/Presentation/channels.php`). Solo el servidor emite: los dispositivos no pueden enviar mensajes entre sí (`accept_client_events_from = none`).

| Canal | Quién escucha | Eventos |
|---|---|---|
| `sucursal.{id}.salon` | Todo el equipo de la sucursal | `PedidoActualizado`, `PlanoActualizado`, `CartaActualizada` |
| `sucursal.{id}.estacion.{id\|general}` | Cocina (KDS) | `ComandaEnviada`, `PlatoAnulado`, `EstadoCocinaActualizado` |
| `sucursal.{id}.mozo.{usuario}` | Solo ese mozo | `PlatoListo` |

### En producción

Requisitos del Doc. 09 §4.2, con un dominio propio para el WebSocket (por ejemplo `ws.softflyer.pe`):

- **Más de 1 000 conexiones:** instalar la extensión `ext-uv` de PHP y subir el límite de archivos abiertos (`ulimit -n 10000`). Sin `ext-uv`, Reverb no pasa de ~1 000 conexiones.
- **Siempre arriba:** correr `php artisan reverb:start` con Supervisor (reinicio automático) y ejecutar `php artisan reverb:restart` en cada despliegue.
- **Nginx con TLS** delante de Reverb: el navegador usa `wss://`. El proxy necesita `Upgrade` y `Connection`, y un `proxy_read_timeout` de 60 s o más.
- **Variables:** `REVERB_SCHEME=https` y `REVERB_PORT=443` para que Laravel publique por el proxy; en el frontend, `NEXT_PUBLIC_REVERB_HOST=ws.softflyer.pe`, `NEXT_PUBLIC_REVERB_PORT=443` y `NEXT_PUBLIC_REVERB_SCHEME=https`.
- **Orígenes:** `REVERB_ALLOWED_ORIGINS` solo con los dominios de Softflyer (por ejemplo `*.softflyer.pe`), nunca `*`.
- **Más de un servidor de Reverb** (alta disponibilidad o más de 5 000–10 000 conexiones): activar `REVERB_SCALING_ENABLED=true` con Redis.
- **Antes de abrir a clientes:** prueba de carga con `tests/carga/reverb.k6.js` contra staging.

## Pruebas

```powershell
php artisan test
```

Usa la base `factura_softfly_test` con RLS real. Una spec no se cierra con pruebas en rojo.

La suite se conecta como `softflyer_app` (sin superusuario ni `BYPASSRLS`) porque `phpunit.xml` fija `DB_USERNAME`; así RLS aplica igual que en producción aunque tu `.env` use `postgres` para desarrollo. Si tu rol `softflyer_app` tiene contraseña, expórtala antes: `DB_PASSWORD=... php artisan test`.

**No uses `migrate:fresh` para probar migraciones:** apunta a la base de desarrollo. `php artisan test` ya migra `factura_softfly_test` por su cuenta.

Las pruebas usan el driver de broadcasting `null`, así que no necesitan Reverb corriendo.
