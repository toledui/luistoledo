# Manual de despliegue — sin Docker

Este procedimiento despliega Luis Toledo Academy directamente desde la terminal en un servidor Linux. Se recomienda Ubuntu LTS, Node.js 22 LTS o superior, MySQL 8/MariaDB compatible, Nginx y un administrador de procesos como systemd o PM2.

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
ExecStart=/usr/bin/node dist/main.js
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

```bash
journalctl -u lta-backend -f
journalctl -u lta-frontend -f
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

Si los recursos subidos no cargan, revisa `BACKEND_PUBLIC_URL`, permisos de `backend/uploads/` y el proxy `/uploads/`.

