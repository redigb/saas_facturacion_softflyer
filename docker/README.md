# Softflyer en Docker (para probar)

Levanta todo el sistema en cualquier equipo con un solo comando, sin instalar PHP, PostgreSQL ni Node. Sirve para **probar y mostrar avances**; no es la configuración de producción (ver `docs-tecnicos/Softflyer_Documento_10_Servicios_Produccion.md`).

## Qué levanta

| Servicio | Qué es | Versión | Dirección |
|---|---|---|---|
| `db` | PostgreSQL con RLS, roles `softflyer_owner` y `softflyer_app` | 17 | `localhost:5433` |
| `api` | API Laravel (migra y siembra sola al arrancar) | PHP 8.3 | <http://localhost:8000> |
| `worker` | Cola de trabajos (envíos a SUNAT, correos) | PHP 8.3 | — |
| `scheduler` | Tareas programadas (reintentos) | PHP 8.3 | — |
| `reverb` | Tiempo real (cocina, mozos) | PHP 8.3 | `localhost:8080` |
| `web` | Frontend Next.js (build de producción) | Node 24 LTS | <http://localhost:3000> |
| `mailpit` | Bandeja falsa: aquí llegan todos los correos | — | <http://localhost:8025> |

Las imágenes siguen la rama estable de cada versión (`postgres:17-alpine`, `php:8.3-cli-bookworm`, `node:24-alpine`): al reconstruir reciben los parches de seguridad sin saltar de versión mayor.

## Requisitos

- Docker Desktop (Windows/Mac) o Docker Engine + Compose v2 (Linux), encendido.
- Puertos libres: 3000, 8000, 8080, 5433 y 8025. Si alguno está ocupado, ver "Cambiar puertos".
- Detener `php artisan serve` y `npm run dev` locales si están corriendo (usan los mismos puertos).

## Arrancar

Desde la raíz del repositorio:

```bash
docker compose up -d --build
```

La primera vez tarda unos minutos (descarga imágenes, instala dependencias y compila el frontend). Para ver el avance: `docker compose logs -f api web`.

Cuando `docker compose ps` muestre `api` como `healthy`, entra a:

| Dónde | Dirección | Usuario | Contraseña |
|---|---|---|---|
| Demo pública | <http://demo.localhost:3000> | botón "Entrar a la demo" | — |
| Restaurante Don José | <http://donjose.localhost:3000> | `admin@donjose.pe` | `donjose-2026` |
| Backoffice | <http://admin.localhost:3000/plataforma> | `admin@softflyer.pe` | `admin-softflyer-2026` |
| Correos enviados | <http://localhost:8025> | — | — |

Chrome, Edge y Firefox resuelven `*.localhost` solos. Safari no: en Mac, usar Chrome o agregar las entradas a `/etc/hosts`.

## Uso diario

```bash
docker compose up -d --build     # después de un git pull: reconstruye con el código nuevo
docker compose ps                # estado de cada servicio
docker compose logs -f api       # registros de la API (también: worker, web, reverb)
docker compose stop              # apagar sin perder datos
docker compose down              # apagar y borrar contenedores (los datos quedan)
docker compose down -v           # BORRA TODO: base de datos y archivos subidos
```

Comandos de Laravel dentro del contenedor:

```bash
docker compose exec api php artisan tinker
docker compose exec api php artisan db:seed --class=InventarioDonJoseSeeder --database=pgsql_owner
```

## Pruebas del backend

```bash
docker compose run --rm test
```

Corren contra `factura_softfly_test`, una base aparte, así que no tocan los datos con los que estás probando. Si por error apuntaran a otra base, las pruebas se detienen antes de borrar nada.

## Cambiar puertos o claves

Copia `docker/.env.example` como `.env` en la raíz del repositorio y ajusta lo que necesites, por ejemplo `REVERB_PUBLIC_PORT=8090` si el 8080 está ocupado. Si cambias `REVERB_APP_KEY` o `REVERB_PUBLIC_PORT`, reconstruye el frontend con `docker compose up -d --build web`, porque van incrustados en el JavaScript.

Si cambias `WEB_PORT`, las direcciones pasan a ser `http://demo.localhost:<puerto>`.

## Problemas comunes

- **"No existe una empresa registrada en esta dirección":** entraste por `localhost:3000` sin subdominio. Usa `demo.localhost:3000`.
- **La base no se crea o cambiaste las contraseñas de la base después del primer arranque:** el script de roles solo corre con el volumen vacío. Ejecuta `docker compose down -v` y vuelve a levantar.
- **`api` reinicia en bucle:** revisa `docker compose logs api`; casi siempre es una migración que falló.
- **Avisos en tiempo real no llegan:** confirma que `reverb` está arriba y que el puerto del navegador coincide con `REVERB_PUBLIC_PORT`.
- **En Windows, `entrypoint.sh: not found`:** el archivo quedó con saltos de línea CRLF. El repo los fuerza a LF (`.gitattributes`); vuelve a clonar o ejecuta `git add --renormalize .`.
