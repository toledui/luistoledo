# Manual de despliegue — sin Docker

Este procedimiento despliega Luis Toledo Academy directamente desde la terminal en un servidor Linux. Para este servidor se conserva Node.js 20.20.0, con Ubuntu LTS, MySQL 8/MariaDB compatible, Nginx y PM2. No actualices el Node del sistema: el servidor comparte el runtime con otras webs. `.nvmrc` indica 20.20.0 para reproducir el entorno; no cambia Node ni PM2 automáticamente. Algunas dependencias declaran un mínimo superior y pueden emitir advertencias de engine; se deben distinguir de errores de instalación y validar compilación y pruebas con el runtime conservado.

## Actualización de masterclass en producción existente — PM2

Esta entrega agrega una sola migración: `20261015000000_masterclass_registrations`. Crea `MasterclassRegistration`, sus índices y una clave foránea a `EmailQueue`. No contiene `DROP`, `TRUNCATE`, `DELETE`, `UPDATE` ni cambios a las tablas de usuarios, cursos, pedidos o configuración. Los dos correos de inscripción usan la cola existente y no necesitan seed ni tablas adicionales.

**No ejecutes `npm run setup`, `npm run db:seed`, `prisma migrate reset`, `prisma migrate dev` ni `prisma db push` en esta actualización.** El seed actual puede cambiar la contraseña del administrador, eliminar el administrador local predeterminado y reemplazar plantillas de correo personalizadas. `setup` ejecuta ese seed. Los scripts `build`, `db:generate`, `db:status` y `db:deploy` no ejecutan seed. `start:prod` tiene un pre-script que aplica migraciones pendientes, por eso hay que revisar el estado antes de arrancarlo.

Estos pasos asumen `/var/www/luistoledo`, MySQL local y dos procesos PM2. Sustituye la ruta, usuario y nombre de base por los reales. Usa la misma cuenta del sistema que administra tus procesos PM2. No copies el `.env` ni la base de tu computadora sobre producción; conserva `DATABASE_URL`, `APP_ENCRYPTION_KEY`, las claves JWT y `backend/uploads/` del servidor.

1. Publica los cambios de esta entrega en tu repositorio antes de hacer `git pull` en el servidor. Los cambios hechos por Codex en esta conversación están en el directorio local; no se han confirmado ni enviado a Git automáticamente.
2. Identifica los nombres, rutas y directorios de trabajo actuales:

   ```bash
   cd /var/www/luistoledo
   node --version
   npm --version
   pm2 list
   pm2 describe NOMBRE_BACKEND
   pm2 describe NOMBRE_FRONTEND
   git status --short
   git rev-parse HEAD
   ```

   Mantén Node 20.20.0 y npm 10.8.2, las versiones confirmadas en producción. No ejecutes instaladores de NodeSource, no reemplaces `/usr/bin/node`, no actualices npm globalmente ni reinicies todo PM2 para esta entrega. Primero corrige los lockfiles y valida la instalación con las versiones existentes.

   El directorio de trabajo del backend debe ser `/var/www/luistoledo/backend`: el servicio resuelve `.env` y `uploads/` desde ese directorio. El build actual genera `backend/dist/src/main.js`. Si el proceso apunta a `dist/main.js`, corrige su configuración PM2 antes de reiniciarlo. No uses `git reset --hard` para resolver cambios propios del servidor.
3. Haz respaldo fuera del directorio público. En una ventana breve de mantenimiento, detén solamente estos dos procesos para no recibir nuevas inscripciones, pedidos o archivos durante el respaldo y la actualización:

   ```bash
   pm2 stop NOMBRE_FRONTEND NOMBRE_BACKEND
   (
   set -e
   cd /var/www/luistoledo
   backup_dir="$HOME/backups/luistoledo/$(date +%Y%m%d-%H%M%S)"
   umask 077
   mkdir -p "$backup_dir"
   git rev-parse HEAD > "$backup_dir/commit.txt"
   cp backend/.env "$backup_dir/backend.env"
   mysqldump -h 127.0.0.1 -u USUARIO_DB -p --single-transaction --no-tablespaces luistoledo > "$backup_dir/database.sql"
   test -s "$backup_dir/database.sql"
   tar -czf "$backup_dir/uploads.tar.gz" backend/uploads
   tar -tzf "$backup_dir/uploads.tar.gz" > /dev/null
   )
   ```

   Guarda también tus archivos de entorno del frontend y la configuración PM2 donde los administres. Verifica que el dump se completó sin errores y que puedes restaurarlo en una base temporal independiente antes de continuar. No restaures el dump sobre producción como parte de un deploy normal. Si falla el respaldo, no avances con las migraciones.
4. Descarga el código e instala las versiones del lockfile, sin actualizar dependencias:

   ```bash
   git pull --ff-only
   npm ci
   npm ci --include=dev --prefix backend
   npm ci --include=dev --prefix frontend
   npm run db:generate
   npm run db:status
   ```

   `db:status` es de lectura y puede terminar con código distinto de cero cuando hay pendientes. **Para esta entrega, si producción ya estaba al día, la única pendiente debe ser `20261015000000_masterclass_registrations`.** Si aparecen migraciones fallidas, historial divergente u otras pendientes, revisa esas migraciones antes de aplicar. No marques migraciones como aplicadas sin comprobar el esquema real. Este proyecto usa Prisma 7; utiliza los scripts y el CLI instalado, no un CLI actualizado a otra versión.
5. Revisa el SQL y compila antes de tocar la base:

   ```bash
   cat backend/prisma/migrations/20261015000000_masterclass_registrations/migration.sql
   npm run build
   test -f backend/dist/src/main.js
   ```

   Si la compilación termina correctamente y la lista de pendientes coincide con lo revisado, aplica:

   ```bash
   npm run db:deploy
   npm run db:status
   ```

   `db:deploy` ejecuta todas las migraciones pendientes registradas en el proyecto, no solamente la de masterclass. No recrea la base ni ejecuta el seed, pero el efecto depende del SQL pendiente. Por eso se exige la revisión previa. No modifiques ni vuelvas a importar datos en este paso. Si MySQL reporta una migración fallida, conserva el error y no ejecutes un reset: su DDL no se revierte necesariamente como una sola transacción.
6. Reinicia los dos procesos existentes y comprueba:

   ```bash
   pm2 restart NOMBRE_BACKEND
   pm2 restart NOMBRE_FRONTEND
   pm2 status
   pm2 logs NOMBRE_BACKEND --lines 100 --nostream
   pm2 logs NOMBRE_FRONTEND --lines 50 --nostream
   curl -fsS https://luistoledo.com.mx/api/v1/health
   curl -fsS https://luistoledo.com.mx/api/v1/masterclass
   pm2 save
   ```

   Si cambias variables definidas por PM2, actualízalas en su configuración original y usa `--update-env` al reiniciar. No lo uses para cargar accidentalmente claves de otro entorno. `--update-env` no lee por sí solo un `.env`: el backend carga el suyo desde su directorio de trabajo. Mantén una sola instancia de backend en esta configuración, salvo que hayas diseñado la coordinación de tareas programadas para múltiples instancias.
7. Inicia sesión nuevamente en el admin. Verifica cursos, usuarios y configuración existentes, abre `/masterclass` y Admin → Masterclass. Haz una inscripción controlada con un correo tuyo: debe conservarse en el admin, enviar el aviso administrativo y enviar la confirmación con WhatsApp al inscrito. No borres archivos subidos ni ejecutes seed para corregir errores de correo o imágenes.

Si necesitas corregir una ruta PM2, hazlo en el ecosystem que ya uses. Para una instalación nueva de procesos, las rutas correctas son `dist/src/main.js` con `cwd` en `backend` y `npm run start` con `cwd` en `frontend`; no crees procesos adicionales sobre los existentes porque competirían por los mismos puertos.

### Diagnóstico de los errores reportados

#### Registro de masterclass: `Unsupported state or unable to authenticate data`

Si el stack del backend incluye `EncryptionService.decrypt`, `ContactsService.verifyTurnstile` y `MasterclassService.register`, la clave secreta guardada de Turnstile no se puede descifrar con la `APP_ENCRYPTION_KEY` del proceso actual. El registro se interrumpe antes de guardarse. No es un error del teléfono ni del envío SMTP.

Conserva la clave de cifrado original si está disponible. Si la clave vigente es la que se mantendrá, entra al admin en **Configuración → Contacto**, copia desde Cloudflare la **Secret key** del mismo widget que corresponde a la **Site key**, pégala en el campo Secret key y pulsa **Guardar**. Guardar con el campo vacío conserva el valor anterior y no lo repara. Este paso vuelve a cifrar solamente el secreto de Turnstile con la clave vigente; no requiere migraciones, seed ni reinicio. Reintenta el registro con una verificación nueva.

El backend devuelve un 503 con un mensaje de verificación temporalmente no disponible cuando no puede descifrar el secreto, y deja las instrucciones de recuperación en el log. Mantiene la verificación habilitada y no confirma una inscripción que no se haya guardado. Las credenciales SMTP o Stripe cifradas con otra clave requieren su propia recuperación; volver a guardar Turnstile no las repara.

#### Continuar conservando Node 20.20.0 y el PM2 existente

El servidor tiene Ubuntu 24.04.3 LTS x86_64, Node 20.20.0, npm 10.8.2 y varios sitios en PM2. Esta entrega mantiene esas versiones. El error que detuvo la instalación fue `EUSAGE` por entradas faltantes en los lockfiles; `EBADENGINE` es una advertencia separada con la configuración habitual de npm.

Sube las correcciones de los lockfiles y manifiestos al repositorio. En el servidor, sin cambiar Node:

```bash
cd /var/www/luistoledo
node --version
npm --version
git pull --ff-only origin main
npm ci
npm ci --include=dev --prefix backend
npm ci --include=dev --prefix frontend
npm run db:generate
npm run db:status
```

Si aparece un error real, detente en ese paso. No uses `--force` ni ignores un fallo de engine con `engine-strict=true`: conserva el mensaje para revisar la dependencia. No se baja la versión de `sanitize-html` para ocultar advertencias. Esa dependencia declara Node >=22.12.0 y Prisma tiene un paquete de desarrollo opcional que declara Node >=22; que el proyecto compile y sus pruebas pasen con Node 20 no cambia el soporte declarado por sus proveedores.

Después del respaldo y de revisar que la única migración pendiente sea la de masterclass, continúa con compilación y migración según los pasos anteriores. Detén o reinicia solamente los procesos de Luis Toledo: los IDs confirmados fueron 5 (backend) y 6 (frontend). No uses `pm2 restart all`, `pm2 update` ni borres los procesos de las otras webs. Verifica de nuevo los IDs antes de actuar si la lista cambió. Usa `pm2 save` después de comprobar la web.

La reparación de lockfiles no añade ni ejecuta migraciones, no ejecuta el seed y no actualiza las dependencias directas. Se agregan los registros transitivos omitidos, con `@emnapi/wasi-threads` del backend ajustado de 1.2.2 a 1.2.3. Los avisos de `npm audit` son un informe separado: no ejecutes `npm audit fix --force` durante esta reparación.

#### Referencias de errores

- **`npm ci` → `EUSAGE` y paquetes `@emnapi` faltantes:** los lockfiles anteriores omitían dependencias opcionales/peer necesarias para validar la instalación con npm 10. Esta corrección agrega los registros faltantes de `@emnapi/core` y `@emnapi/runtime`, y las entradas de `wasi-threads` requeridas. La consistencia se comprobó con `npm ci --dry-run --ignore-scripts` usando npm 10.8.2 en directorios vacíos separados. Sube y descarga los lockfiles corregidos del backend y frontend; no borres los lockfiles ni uses `--force`, `--legacy-peer-deps` o `npm audit fix` para saltar este error. La comprobación de lockfile no ejecuta seeds, migraciones ni scripts de instalación y no sustituye la compilación real en Linux.
- **`npm WARN EBADENGINE`:** el servidor reportó Node 20.20.0, pero `sanitize-html` declara Node >=22.12.0 y `@prisma/streams-local` declara Node >=22.0.0. Se conserva Node 20.20.0 por decisión del despliegue compartido. Los manifiestos declaran `^20.20.0 || ^22.13.0 || >=24.0.0`. `jsdom` también admite Node 20.19.0+, por lo que no exige cambiar la rama 20. Los avisos restantes de proveedores no se corrigen modificando su metadata.

- **`/admin/email/test` → 503:** el backend no pudo completar la prueba. Abre DevTools → Network → la solicitud → Response y consulta `message`, o revisa Configuración → Correo junto al botón de prueba. La versión actual muestra el error ahí, actualiza el estado después de fallar y registra el código SMTP en los logs de PM2. Guarda los cambios antes de probar: la prueba usa la configuración persistida, no los campos sin guardar.
- **Credenciales cifradas:** conserva exactamente `APP_ENCRYPTION_KEY`. Cambiarla o arrancar PM2 desde otra carpeta puede impedir descifrar SMTP. Recupera la clave original antes de volver a guardar secretos; otros secretos también dependen de ella. El código ahora devuelve un mensaje específico cuando falla el descifrado.
- **Puertos y seguridad SMTP:** normalmente 587 usa STARTTLS con «SSL directo» desactivado; 465 usa TLS con «SSL directo» activado. El backend actual toma la conexión directa del indicador `sslEnabled`; seleccionar «Seguridad» por sí solo no cambia ese indicador. Confirma los valores indicados por tu proveedor. No desactives la validación de certificados para resolver el error.
- **Timeout/conexión:** `ETIMEDOUT`, `ECONNECTION` o `ECONNREFUSED` requieren revisar conectividad desde el servidor, firewall y restricciones de salida del hosting. `EAUTH` indica un fallo de autenticación; revisa usuario, contraseña y el método permitido por tu proveedor. Un rechazo al remitente requiere revisar la identidad de envío autorizada. La consola del navegador por sí sola no identifica cuál es tu caso.
- **401 en endpoints administrativos:** comprueba que volver a iniciar sesión resuelva el acceso. Si persiste, revisa `/auth/refresh`, cookies, mismo dominio HTTPS, claves JWT y el directorio/configuración de PM2. Cambiar secretos JWT invalida sesiones existentes. Un 401 aislado seguido de un refresh y reintento exitoso puede ser el vencimiento normal del token.
- **404 en `/_next/image`:** comprueba primero el archivo original `/uploads/media/ARCHIVO.png`. Si también da 404, revisa que exista en `backend/uploads/media/`, que el usuario PM2 tenga permisos de lectura y que Nginx envíe `/uploads/` al backend. El nombre en MySQL no garantiza que el archivo se haya copiado al servidor. Si el original responde 200 y el optimizador falla, revisa logs del frontend y los patrones de imágenes de `next.config.ts`. No borres `uploads/` al actualizar.
- **`ERR_BLOCKED_BY_CLIENT`:** suele venir de una extensión o bloqueador del navegador; comprueba la misma URL sin extensiones. Identifica qué URL está bloqueada antes de asociarlo al correo.
- **Avisos de preload:** son advertencias de recursos precargados; no explican por sí solos una respuesta SMTP 503.

La configuración y autenticación SMTP se verificaron en el entorno local durante el desarrollo; eso no acredita conectividad, credenciales ni entrega desde el servidor productivo. Para cerrar el diagnóstico hace falta el `message` del 503 de producción, sin contraseñas.

## 1. Arquitectura recomendada

- Nginx recibe tráfico HTTPS.
- `/` se envía a Next.js en `127.0.0.1:3000`.
- `/api/` y `/uploads/` se envían a NestJS en `127.0.0.1:4000`.
- MySQL sólo escucha en red privada o localhost.
- Frontend y backend se ejecutan como procesos separados.

## 2. Preparar el servidor

Instala Git, Node.js, npm, MySQL y Nginx. Crea una cuenta de sistema sin privilegios para ejecutar la aplicación y un directorio como:

```bash
sudo mkdir -p /var/www/luistoledo
sudo chown -R deploy:deploy /var/www/luistoledo
cd /var/www/luistoledo
git clone URL_DEL_REPOSITORIO .
npm ci
npm ci --prefix frontend
npm ci --prefix backend
```

No ejecutes la aplicación como `root`.

## 3. Base de datos

Crea una base y un usuario exclusivo:

```sql
CREATE DATABASE luistoledo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'luistoledo_app'@'localhost' IDENTIFIED BY 'CONTRASENA_SEGURA';
GRANT ALL PRIVILEGES ON luistoledo.* TO 'luistoledo_app'@'localhost';
FLUSH PRIVILEGES;
```

## 4. Variables del backend

Copia `backend/.env.example` a `backend/.env` y configura, como mínimo:

```dotenv
NODE_ENV=production
PORT=4000
API_PREFIX=api/v1
FRONTEND_URL=https://academy.ejemplo.com
BACKEND_URL=https://academy.ejemplo.com
BACKEND_PUBLIC_URL=https://academy.ejemplo.com
DATABASE_URL=mysql://luistoledo_app:CONTRASENA@localhost:3306/luistoledo

JWT_ACCESS_SECRET=VALOR_ALEATORIO_LARGO
JWT_REFRESH_SECRET=OTRO_VALOR_ALEATORIO_LARGO
APP_ENCRYPTION_KEY=CLAVE_ALEATORIA_DE_AL_MENOS_32_BYTES

COOKIE_ACCESS_NAME=lt_access
COOKIE_REFRESH_NAME=lt_refresh
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=academy.ejemplo.com
```

Genera secretos con un generador criptográfico, por ejemplo:

```bash
openssl rand -base64 48
```

No cambies `APP_ENCRYPTION_KEY` después de guardar credenciales SMTP, Stripe o Turnstile: esas credenciales están cifradas con dicha clave.

## 5. Variables del frontend

Crea `frontend/.env.production`:

```dotenv
NEXT_PUBLIC_APP_URL=https://academy.ejemplo.com
NEXT_PUBLIC_API_URL=https://academy.ejemplo.com/api/v1
NEXT_PUBLIC_DEFAULT_LOCALE=es-MX
NEXT_PUBLIC_DEFAULT_CURRENCY=MXN
```

Las variables `NEXT_PUBLIC_*` quedan incorporadas durante `next build`; si cambian, recompila.

## 6. Migrar y construir

```bash
npm run db:generate
npm run db:deploy
npm run build
npm run lint
npm test
```

`db:deploy` aplica migraciones existentes y es el comando apropiado en producción. No uses `prisma migrate dev` en el servidor productivo.

El seed crea datos iniciales y puede crear el superadministrador. Ejecútalo solamente cuando corresponda:

```bash
npm run db:seed
```

## 7. Ejecutar los procesos

### Opción A: systemd

Backend (`/etc/systemd/system/lta-backend.service`):

```ini
[Unit]
Description=Luis Toledo Academy API
After=network.target mysql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/luistoledo/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/src/main.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Frontend (`/etc/systemd/system/lta-frontend.service`):

```ini
[Unit]
Description=Luis Toledo Academy Frontend
After=network.target lta-backend.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/luistoledo/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Activa los servicios:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lta-backend lta-frontend
sudo systemctl status lta-backend lta-frontend
```

## 8. Nginx

Configuración base:

```nginx
server {
    listen 80;
    server_name academy.ejemplo.com;

    client_max_body_size 10m;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Activa HTTPS con Cloudflare o Certbot. No habilites `COOKIE_SECURE=true` hasta servir el sitio mediante HTTPS.

## 9. Stripe

1. Configura las claves Live desde Panel administrativo → Configuración → Pagos.
2. Crea un webhook en Stripe para:
   `https://academy.ejemplo.com/api/v1/payments/webhooks/stripe`
3. Suscribe al menos `checkout.session.completed`.
4. Guarda el signing secret del webhook en la configuración de pagos.
5. Ejecuta una compra real de importe pequeño y confirma pedido, matrícula y correos.

La página de éxito también valida el `session_id` directamente con Stripe como respaldo, pero el webhook debe permanecer configurado.

## 10. Correo, Turnstile y branding

- Configura SMTP y envía un correo de prueba.
- Publica registros SPF, DKIM y DMARC para el dominio remitente.
- Crea un widget de Cloudflare Turnstile para el dominio y guarda Site Key y Secret Key en Configuración → Contacto.
- Sube logos y favicon usando URLs públicas definitivas.

## 11. Persistencia y respaldos

Respalda diariamente:

- Base de datos MySQL.
- `/var/www/luistoledo/backend/uploads/`.
- Archivos `.env` mediante un almacén seguro, no dentro de Git.

Antes de cada despliegue:

```bash
mysqldump --single-transaction luistoledo > backup-$(date +%F-%H%M).sql
tar -czf uploads-$(date +%F-%H%M).tar.gz backend/uploads
```

## 12. Actualizaciones

```bash
cd /var/www/luistoledo
git pull --ff-only
npm ci --prefix frontend
npm ci --prefix backend
npm run db:generate
npm run db:deploy
npm run build
sudo systemctl restart lta-backend lta-frontend
```

Comprueba después:

- `/api/v1/health`
- Home, login y panel.
- Carga de archivos.
- Checkout sandbox/live según el entorno.
- Envío de correo.

## 13. Diagnóstico

### Masterclass

Esta versión requiere la migración `20261015000000_masterclass_registrations`. Ejecuta `npm run db:generate` y `npm run db:deploy` antes de iniciar el backend actualizado. La tabla conserva inscripciones sin crear cuentas de alumnos.

Verifica el destinatario en Configuración → Contacto y el proveedor activo en Configuración → Correo. El modo LOG solo simula envíos. Los avisos se intentan inmediatamente y usan la cola existente para reintentos; mantén el backend activo. Los registros se consultan en Admin → Masterclass, con estado del aviso y reintento manual. El acceso al grupo aparece al confirmar la inscripción y cada participante debe aceptar la invitación en WhatsApp.

### Logs del servidor

```bash
journalctl -u lta-backend -f
journalctl -u lta-frontend -f
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

Si los recursos subidos no cargan, revisa `BACKEND_PUBLIC_URL`, permisos de `backend/uploads/` y el proxy `/uploads/`.

