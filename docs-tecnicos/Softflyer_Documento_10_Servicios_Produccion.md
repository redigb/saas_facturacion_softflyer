# Especificación Técnica — SaaS Facturación Softflyer
## Documento N.° 10 — Conexión de servicios externos para producción

**Proyecto:** SaaS Facturación Softflyer
**Estado:** Guía operativa (se actualiza en cada servicio nuevo)
**Depende de:** Doc. N.° 01 (arquitectura), Doc. N.° 03 (aprovisionamiento), Doc. N.° 04 (Greenter), Doc. N.° 06 (seguridad)

---

## 0. Cómo leer este documento

Cada sección dice **qué servicio**, **qué opción recomendamos**, **qué variables cambia** y **cómo comprobar que funciona**. El código no cambia entre desarrollo y producción: solo el `.env` del backend (`back-softflyer/.env`) y el del frontend (`front-next/.env.local` o las variables del hosting).

Regla general: **ningún secreto va al repositorio**. Las claves viven en el gestor de secretos del hosting (o en el `.env` del servidor, con permisos `600`).

| Servicio | Desarrollo (hoy) | Producción recomendada |
|---|---|---|
| Correo | `log` (o Mailpit) | Resend / Brevo / Amazon SES |
| Cola de trabajos | `database` + `queue:work` a mano | `database` o Redis + Supervisor/systemd |
| Tareas programadas | a mano | `schedule:run` cada minuto (cron) |
| Base de datos | PostgreSQL local, usuario `postgres` | PostgreSQL gestionado, usuario sin privilegios |
| Archivos (fotos de platos) | disco `public` + `storage:link` | disco `public` en el servidor, o S3 / Cloudflare R2 |
| Tiempo real | Reverb local | Reverb detrás de Nginx con TLS |
| Dominio | `*.localhost` | `*.softflyer.pe` con DNS y certificado comodín |
| SUNAT | beta | producción por empresa homologada |

---

## 1. Correo transaccional

Lo usan hoy: verificación de la prueba gratis, activación de cuenta del alta directa (spec 036), enlace para restablecer contraseña y aviso de contraseña cambiada (spec 035). **Todos salen por la cola** (spec 036): sin el worker de §2 no se envía ninguno. Mañana: comprobantes por correo y recordatorios de renovación (spec 018).

### 1.1 Por qué no enviar desde nuestro propio servidor

Laravel arma el correo, pero alguien tiene que **entregarlo**. Un servidor propio (Postfix) en un VPS nuevo no tiene reputación: Gmail y Outlook lo mandan a spam, y muchos proveedores (AWS, DigitalOcean, Google Cloud) bloquean el puerto 25. Un proveedor transaccional resuelve entrega, rebotes y reputación por centavos.

### 1.2 Opciones

| Proveedor | Gratis | Después | Integración Laravel | Comentario |
|---|---|---|---|---|
| **Resend** (recomendado para empezar) | ~3 000/mes, 100/día | desde USD 20/mes | `MAIL_MAILER=resend` (`composer require resend/resend-php`) | El más simple de configurar. |
| **Brevo** | 300/día | por volumen | SMTP | Panel en español, útil si luego hay marketing. |
| **Amazon SES** | — | ~USD 0.10 por 1 000 | `MAIL_MAILER=ses` (`composer require aws/aws-sdk-php`) | El más barato a escala; arranca en "sandbox" y hay que pedir salida. |
| Postmark / Mailgun | prueba | desde ~USD 15/mes | driver propio | Excelente entrega; más caro. |
| Gmail / Workspace SMTP | — | — | SMTP + contraseña de aplicación | **Solo pruebas**: tope ~500/día y riesgo de bloqueo de la cuenta. |

### 1.3 Pasos (ejemplo con Resend)

1. Crear la cuenta y agregar el dominio `softflyer.pe` (o un subdominio de envío como `mail.softflyer.pe`, que aísla la reputación del correo del equipo).
2. Copiar en el DNS los registros que da el proveedor:
   - **SPF** (`TXT`): autoriza al proveedor a enviar por el dominio.
   - **DKIM** (`TXT`/`CNAME`): firma cada correo.
   - **DMARC** (`TXT` en `_dmarc.softflyer.pe`): empezar con `v=DMARC1; p=none; rua=mailto:dmarc@softflyer.pe` y endurecer a `p=quarantine` cuando los reportes estén limpios.
3. Esperar la verificación del dominio en el panel del proveedor.
4. Backend:
   ```dotenv
   MAIL_MAILER=resend
   RESEND_API_KEY=re_xxxxxxxx
   MAIL_FROM_ADDRESS="no-responder@softflyer.pe"
   MAIL_FROM_NAME="Softflyer"
   SOFTFLYER_FRONTEND_URL=https://softflyer.pe
   ```
   `SOFTFLYER_FRONTEND_URL` arma los enlaces de los correos: el de restablecer contraseña se convierte en `https://{slug}.softflyer.pe/restablecer?token=…`.
5. Comprobar: `php artisan tinker` → `Mail::raw('prueba', fn ($m) => $m->to('tu@correo.com')->subject('Prueba'));` y revisar la bandeja y la pestaña "Logs" del proveedor. Probar también en [mail-tester.com](https://www.mail-tester.com) (objetivo: 9/10 o más).

Con SMTP (Brevo u otro) el bloque es:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=usuario-del-proveedor
MAIL_PASSWORD=clave-smtp-del-proveedor
```

### 1.4 Desarrollo: Mailpit

Con el entorno de Docker (`docker compose up -d`, guía en `docker/README.md`) todos los correos llegan a Mailpit, una bandeja falsa en <http://localhost:8025>; no sale nada a internet.

Fuera de Docker se puede usar el mismo Mailpit (`docker compose up -d mailpit`, que expone el SMTP solo dentro de la red de Docker) o dejar `MAIL_MAILER=log` en `back-softflyer/.env`: los correos quedan en `storage/logs/laravel.log`.

### 1.5 Pendiente antes del primer cliente real

- [x] Enviar los correos por la cola (spec 036): cifrados, después del commit y con 3 intentos. Exige que el worker (§2) esté corriendo.
- [ ] Atender rebotes y quejas (webhook del proveedor) para no seguir escribiendo a correos que no existen.

---

## 2. Cola de trabajos y tareas programadas

Ya hoy dependen de esto los envíos a SUNAT con reintentos (spec 017b/017c) y los avisos en tiempo real.

- **Worker** permanente, reiniciado si se cae (Supervisor o un servicio systemd):
  ```ini
  [program:softflyer-worker]
  command=php /var/www/back-softflyer/artisan queue:work --sleep=3 --tries=3 --max-time=3600
  autostart=true
  autorestart=true
  numprocs=2
  user=www-data
  stdout_logfile=/var/log/softflyer/worker.log
  ```
- **Scheduler** cada minuto (cron del usuario del sitio):
  ```cron
  * * * * * cd /var/www/back-softflyer && php artisan schedule:run >> /dev/null 2>&1
  ```
- En cada despliegue: `php artisan queue:restart` para que los workers tomen el código nuevo.
- `QUEUE_CONNECTION=database` alcanza para empezar. Pasar a Redis (`QUEUE_CONNECTION=redis`) cuando haya muchos restaurantes en hora punta.

---

## 3. Base de datos PostgreSQL

- **Gestionada** (DigitalOcean Managed, AWS RDS, Supabase, Neon) con copias automáticas diarias y retención de 7 a 30 días. Probar una restauración al menos una vez antes de vender.
- **Dos usuarios, nunca `postgres`:**
  - `softflyer_app` (`DB_USERNAME`): sin `SUPERUSER` ni `BYPASSRLS`. Es lo que hace cumplir RLS: con un superusuario **las políticas no se aplican** y un error de código podría mostrar datos de otro restaurante.
  - `softflyer_owner` (`DB_OWNER_USERNAME`): dueño de las tablas, solo para migraciones: `php artisan migrate --database=pgsql_owner --force`.
- Nunca `migrate:fresh` en producción.
- Conexión con TLS (`DB_SSLMODE=require` si el proveedor lo pide) y la base sin acceso público, solo desde el servidor de la API.

---

## 4. Archivos (fotos de la carta)

Las fotos de platos se guardan en el disco `public` (`storage/app/public`) y se sirven por `/storage/...`.

- **Un solo servidor:** basta `php artisan storage:link` una vez en el servidor. Respaldar `storage/app` junto con la base de datos.
- **Varios servidores o contenedores:** usar un bucket compatible con S3, como **Cloudflare R2** (sin costo de salida) o AWS S3:
  ```dotenv
  FILESYSTEM_DISK=s3
  AWS_ACCESS_KEY_ID=...
  AWS_SECRET_ACCESS_KEY=...
  AWS_DEFAULT_REGION=auto
  AWS_BUCKET=softflyer-media
  AWS_ENDPOINT=https://<cuenta>.r2.cloudflarestorage.com
  AWS_URL=https://media.softflyer.pe
  AWS_USE_PATH_STYLE_ENDPOINT=true
  ```
  Antes de cambiarlo, apuntar el código de las fotos a un disco configurable (hoy usa `Storage::disk('public')` fijo).
- Los XML y CDR de SUNAT van al disco `local` (privado). **No** deben quedar en un bucket público. Se conservan 5 años (obligación tributaria).

---

## 5. Tiempo real (Reverb)

- Proceso permanente: `php artisan reverb:start --host=0.0.0.0 --port=8080`, bajo Supervisor como el worker.
- Nginx expone `wss://` en el 443 y reenvía al 8080 (con los encabezados `Upgrade` y `Connection`).
- Backend: `REVERB_HOST=softflyer.pe`, `REVERB_PORT=443`, `REVERB_SCHEME=https`, `REVERB_ALLOWED_ORIGINS=*.softflyer.pe`.
- Frontend: `NEXT_PUBLIC_REVERB_KEY` (igual a `REVERB_APP_KEY`), `NEXT_PUBLIC_REVERB_PORT=443`, `NEXT_PUBLIC_REVERB_SCHEME=https`.
- Sin Reverb el panel sigue funcionando, pero sin avisos instantáneos (cocina y mozos lo notan).

---

## 6. Dominio, subdominios y HTTPS

Cada restaurante entra por `{slug}.softflyer.pe` y el backoffice por `admin.softflyer.pe` (Doc. 06 §1.1).

- DNS: registro `A` (o `CNAME`) para `softflyer.pe` **y un comodín `*.softflyer.pe`** hacia el servidor del frontend.
- Certificado **comodín** (`*.softflyer.pe`): Let's Encrypt solo lo emite con validación DNS-01. Con Cloudflare delante, el certificado del borde ya es comodín.
- Variables:
  - Backend: `SOFTFLYER_DOMINIO_CENTRAL=softflyer.pe`, `APP_URL=https://api.softflyer.pe` (o la URL interna), `SESSION_SECURE_COOKIE=true`.
  - Frontend: `APP_ROOT_DOMAIN=softflyer.pe`, `API_URL=` URL interna de la API (no hace falta exponerla a internet si Next la llama desde el servidor).
- El proxy debe reenviar `X-Forwarded-Host` y `X-Forwarded-For`: la API decide el restaurante por el host, y el bloqueo por intentos usa la IP. Hoy `bootstrap/app.php` solo confía en `127.0.0.1` (`trustProxies`): agregar la IP del balanceador o de Next si corren en otra máquina.

---

## 7. SUNAT (Greenter)

- Cada empresa usa **su** certificado digital y **su** clave SOL, cargados desde el backoffice (spec 017a). Softflyer no factura con credenciales propias por sus clientes.
- Una empresa sale a producción solo cuando el backoffice marca la homologación (spec 017b). Hasta entonces sus comprobantes van a beta o quedan simulados.
- Requisitos del servidor: extensiones `openssl`, `soap`, `zip` y hora sincronizada (NTP); SUNAT rechaza firmas con la hora corrida.
- Ver los pendientes de verificar solo en producción en `specs/README.md`.

---

## 8. Observabilidad y errores

- `APP_DEBUG=false` y `LOG_LEVEL=warning` en producción. Nunca mostrar trazas al usuario.
- Errores con aviso: **Sentry** (Laravel y Next) o Laravel Nightwatch. Ninguno está instalado todavía.
- Disponibilidad: un monitor externo (UptimeRobot, Better Stack) sobre `https://softflyer.pe` y un endpoint de salud de la API.
- Revisar `failed_jobs` (trabajos fallidos) a diario; en el backoffice está previsto en "Salud técnica".

---

## 9. Lista de verificación del primer despliegue

- [ ] `APP_ENV=production`, `APP_DEBUG=false`, `APP_KEY` generado y respaldado fuera del servidor.
- [ ] Base de datos con `softflyer_app` sin privilegios de superusuario; migraciones con `pgsql_owner`.
- [ ] Correo: dominio verificado (SPF, DKIM, DMARC) y correo de prueba recibido en Gmail y Outlook.
- [ ] Worker y scheduler corriendo bajo Supervisor/cron.
- [ ] `storage:link` (o bucket configurado) y una foto de plato visible.
- [ ] DNS comodín y HTTPS en `softflyer.pe`, `admin.softflyer.pe` y un `{slug}.softflyer.pe`.
- [ ] Reverb por `wss://` y un pedido que llega a cocina al instante.
- [ ] "¿Olvidaste tu contraseña?" de punta a punta: llega el correo, el enlace abre el subdominio correcto y la nueva contraseña entra.
- [ ] Copias de la base de datos y de `storage/app` probadas con una restauración.
