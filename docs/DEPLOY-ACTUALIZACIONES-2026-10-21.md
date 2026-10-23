# Despliegue acumulado: analítica, blog, sitemap y Sendcorex

Este manual reúne las actualizaciones locales todavía no desplegadas: Google/Meta y panel de analítica, blog con categorías y constructor, sitemap automático, Sendcorex, listado de contactos, sincronización histórica y masiva, importador CSV y seed conservador.

También incluye el nuevo enlace **Eventos** del menú público y la página `/eventos`, con la masterclass gratuita y acceso a su inscripción existente en `/masterclass`. Este cambio solo requiere compilar y reiniciar el frontend; no agrega migraciones ni necesita seed.

Se agregaron el aviso integral en `/aviso-de-privacidad` y la política de cookies en `/politica-de-cookies`, con el responsable y domicilio proporcionados. `/privacidad` redirige permanentemente al nuevo aviso. El botón flotante se retiró; las preferencias están disponibles en la página de cookies y en los enlaces del pie de página. La versión de consentimiento pasa a `2026-10-21.2`: las visitas con una elección anterior volverán a ver el selector, con ambas categorías opcionales desmarcadas. Compila y reinicia frontend y backend para mantener consistente la versión; estos cambios no requieren otra migración ni seed.

**No necesitas ejecutar el seed para esta actualización.** Las migraciones de analítica y blog agregan sus permisos al rol `SUPER_ADMIN`; Sendcorex usa el permiso existente `settings.manage`. El deploy normal aplica migraciones y compila: no borra usuarios, cursos, pedidos, inscripciones ni configuración. Haz un respaldo verificado antes de cualquier cambio de esquema.

Los archivos están en el proyecto local. No se han subido automáticamente al repositorio ni se ha actualizado producción. Publica todos los cambios, incluidos archivos nuevos y las cinco carpetas de migración del 21 de octubre, antes de usar `git pull` en el servidor.

## 1. Identificar los procesos y respaldar

Se conserva el entorno existente del servidor: Node 20.20.0, npm 10.8.2, MySQL/MariaDB, Nginx y PM2. No actualices el Node global ni reinicies otras webs. Sustituye `/var/www/luistoledo`, `NOMBRE_BACKEND`, `NOMBRE_FRONTEND`, `USUARIO_DB` y `luistoledo` por los valores reales. Usa el usuario del sistema que administra esos procesos.

```bash
cd /var/www/luistoledo
node --version
npm --version
git status --short
git rev-parse HEAD
pm2 list
pm2 describe NOMBRE_BACKEND
pm2 describe NOMBRE_FRONTEND
```

Conserva los cambios propios del servidor. No copies el `.env` local sobre producción. Mantén exactamente `DATABASE_URL`, `APP_ENCRYPTION_KEY`, los secretos JWT, los archivos de entorno del frontend, el ecosystem de PM2 y `backend/uploads/`. Cambiar `APP_ENCRYPTION_KEY` impide descifrar los secretos existentes, incluidos SMTP, Turnstile, pagos y Sendcorex.

Detén solamente estos dos procesos durante el mantenimiento y el respaldo, para no recibir cambios entre la copia y la migración:

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
cp frontend/.env.local "$backup_dir/frontend.env.local"
mysqldump -h 127.0.0.1 -u USUARIO_DB -p --single-transaction --no-tablespaces luistoledo > "$backup_dir/database.sql"
test -s "$backup_dir/database.sql"
tar -czf "$backup_dir/uploads.tar.gz" backend/uploads
tar -tzf "$backup_dir/uploads.tar.gz" > /dev/null
echo "Respaldo guardado en: $backup_dir"
)
```

Si el frontend usa otro archivo de entorno o variables del ecosystem, respalda esa configuración en lugar de `frontend/.env.local`. Respalda el ecosystem donde lo administres. Comprueba que el dump terminó sin errores y que puede restaurarse en una base temporal independiente. Si el respaldo falla, no avances.

## 2. Descargar, instalar y revisar las migraciones

Desde la raíz del proyecto:

```bash
git pull --ff-only
npm ci
npm ci --include=dev --prefix backend
npm ci --include=dev --prefix frontend
npm run db:generate
npm run db:status
```

`db:status` puede terminar con código distinto de cero porque haya migraciones pendientes; lee su resultado. Las cinco migraciones nuevas de estas funcionalidades son:

| Migración | Cambios |
|---|---|
| `20261021000000_analytics` | Tablas de analítica, campo nullable en pedidos y permisos de analítica |
| `20261021010000_blog` | Tablas de blog, categorías, historial de slugs y permiso de blog |
| `20261021020000_sendcorex` | Configuración cifrada, cola de envío y preferencia de newsletter en contacto |
| `20261021030000_sendcorex_sync` | Avance persistente de la sincronización masiva |
| `20261021040000_sendcorex_csv` | Directorio importado y avance de las importaciones CSV |

Si aún falta la migración anterior de masterclass `20261015000000_masterclass_registrations`, revisa y aplica también su SQL. `db:deploy` aplica **todas** las migraciones pendientes, no únicamente las de esta tabla. Si hay otras pendientes, historial divergente o una migración fallida, revísalo antes de continuar; no ejecutes un reset ni marques migraciones como aplicadas sin comprobar el esquema.

```bash
cat backend/prisma/migrations/20261021000000_analytics/migration.sql
cat backend/prisma/migrations/20261021010000_blog/migration.sql
cat backend/prisma/migrations/20261021020000_sendcorex/migration.sql
cat backend/prisma/migrations/20261021030000_sendcorex_sync/migration.sql
cat backend/prisma/migrations/20261021040000_sendcorex_csv/migration.sql
```

Estas cinco migraciones agregan tablas, columnas e índices; las dos primeras también agregan permisos faltantes. No contienen instrucciones para borrar datos ni sustituir contraseñas o configuración existentes. Los contactos históricos del formulario quedan con `newsletterOptIn=false`: no se presume aceptación del boletín para mensajes antiguos.

## 3. Compilar y aplicar

Verifica que las variables públicas del frontend correspondan al dominio de producción antes del build. Para el sitemap, `NEXT_PUBLIC_APP_URL` debe ser la URL pública real, por ejemplo `https://luistoledo.com.mx`; conserva `NEXT_PUBLIC_API_URL` con el prefijo real de la API. Los secretos de Sendcorex se configuran en el admin, nunca en variables `NEXT_PUBLIC_*`.

```bash
npm run build
test -f backend/dist/src/main.js
npm run db:deploy
npm run db:status
```

Si un comando falla, detente y conserva el mensaje. No uses `prisma migrate reset`, `prisma migrate dev`, `prisma db push`, `git reset --hard` ni `npm run setup` para corregir un deploy. No ejecutes `npm run db:seed`: no es necesario aquí. `db:deploy`, `db:generate` y `build` no ejecutan seed. El arranque `start:prod` no aplica migraciones: revísalas y aplícalas explícitamente con `npm run db:deploy` antes de reiniciar.

El backend debe tener `cwd` en `/var/www/luistoledo/backend` y ejecutar `dist/src/main.js`. El frontend usa `npm run start` con `cwd` en `frontend`. Corrige el ecosystem existente si sus rutas son distintas; no crees procesos duplicados.

## 4. Reiniciar y comprobar

```bash
pm2 restart NOMBRE_BACKEND
pm2 restart NOMBRE_FRONTEND
pm2 status
pm2 logs NOMBRE_BACKEND --lines 100 --nostream
pm2 logs NOMBRE_FRONTEND --lines 50 --nostream
curl -fsS https://luistoledo.com.mx/api/v1/health
curl -fsS https://luistoledo.com.mx/robots.txt
curl -fsS https://luistoledo.com.mx/sitemap.xml
```

Si actualizaste variables del ecosystem, usa `--update-env` únicamente al reiniciar estos procesos. No reinicies todos los procesos PM2. `--update-env` no carga automáticamente un archivo `.env`; el backend lo lee desde su directorio de trabajo.

Inicia sesión en el admin y comprueba usuarios, cursos, pedidos, archivos e inscripciones existentes. Después:

1. Abre **Blog → Categorías**, crea una categoría y publica un post de prueba. Comprueba `/blog`, el artículo y su aparición automática en `/sitemap.xml`. Los borradores no se incluyen.
2. Abre **Configuración → Analítica** para cargar los identificadores y credenciales de Google y Meta. Sigue [ANALITICA.md](./ANALITICA.md); las credenciales no se crean con el deploy.
3. Abre **Configuración → Sendcorex**, guarda la clave con permisos `contact:create` y `contact:update` y activa la integración.
4. Abre **Contactos / Sendcorex** (`/admin/contactos-sendcorex`). Verás los históricos elegibles aunque todavía no hayan sido enviados. **Sincronizar todos ahora** inicia el proceso completo, incluido el reenvío por correo de contactos previamente confirmados, para recuperar posibles faltantes en el proveedor.
5. El proceso empieza al pulsar el botón y continúa por lotes en segundo plano; puede tardar según el volumen. **Enviado** significa recepción confirmada por Sendcorex, no una consulta en tiempo real de su directorio. Si alguien borra después un contacto en Sendcorex, la sincronización completa vuelve a enviarlo. No reactiva bajas ni suprime las restricciones del proveedor.
6. Comprueba un registro de masterclass, una inscripción gratuita y una compra confirmada con contactos controlados. Prueba contacto con la casilla del boletín marcada y desmarcada. Solo el primero debe generar la suscripción de contacto al directorio.
7. Prueba el CSV con dos o tres contactos tuyos antes de subir todo el directorio, siguiendo [SENDCOREX.md](./SENDCOREX.md).

Cuando el servicio esté verificado:

```bash
pm2 save
```

Si Nginx rechaza el CSV con un 413 antes de llegar al backend, revisa `client_max_body_size` en el bloque de esta web. El importador acepta 2 MB; el límite del proxy debe permitir también la envoltura multipart, por ejemplo 3 MB. Valida `sudo nginx -t` antes de recargar únicamente la configuración necesaria. Si ya permite archivos multimedia grandes, no hace falta cambiarlo.

## 5. Qué hace ahora el seed

El seed anterior sí tenía riesgos para una instalación existente. Se corrigió:

- No borra el usuario `admin@luistoledo.local` ni ningún otro usuario.
- No cambia contraseñas, nombres, estados ni roles asignados a usuarios existentes.
- No reemplaza plantillas de correo personalizadas ni valores de configuración.
- Agrega permisos, roles, asignaciones de permisos al rol `SUPER_ADMIN`, plantillas, ajustes iniciales y categorías **solo si faltan**.
- Solo crea el primer administrador cuando la base no tiene ningún usuario. En ese caso exige `SEED_ADMIN_EMAIL` y una contraseña propia de al menos 12 caracteres; no usa una contraseña pública por defecto. En bases con usuarios no crea otro administrador por cambiar esas variables.
- Se ejecuta dentro de una transacción. Un fallo revierte sus escrituras y devuelve un estado de error.

Puedes repetir el seed corregido para completar valores iniciales faltantes, pero **este deploy no lo requiere**. Las pruebas de preservación lo ejecutan varias veces y verifican que no altere contraseñas, usuarios, roles asignados, plantillas existentes, configuración, cursos, pedidos ni inscripciones. Agregar permisos faltantes a `SUPER_ADMIN` es el único cambio intencional de autorización del seed.

## 6. Si algo falla

Conserva el error de compilación, migración o arranque y los logs de estos dos procesos. No borres la base ni `uploads/`. Las operaciones DDL de MySQL no siempre se revierten como una sola transacción; un fallo de migración requiere revisar qué instrucciones alcanzaron a ejecutarse. No restaures un respaldo sobre producción como paso normal ni ejecutes un reset para desbloquearla.

Un rollback de código no elimina las tablas nuevas. Si llegara a requerirse restaurar datos, verifica primero el respaldo y los datos posteriores al respaldo para no descartar nuevas compras o registros. Mantén la ventana de mantenimiento hasta comprobar la recuperación.
