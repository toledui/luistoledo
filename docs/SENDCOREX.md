# Sendcorex

En **Admin → Configuración → Sendcorex** (`/admin/configuracion/sendcorex`) coloca la clave API y activa la sincronización. Se requiere `settings.manage`. La clave necesita los permisos `contact:create` y `contact:update`; se guarda cifrada con `APP_ENCRYPTION_KEY` y nunca se devuelve al navegador. Una entrada vacía conserva la clave; eliminarla exige desactivar la integración. Conserva la clave de cifrado del servidor entre despliegues.

## Registros automáticos

- Masterclasses: al crear una inscripción confirmada.
- Cursos: al inscribirse gratis, al confirmar el primer pago (Stripe o transferencia), al asignar un curso desde el admin o reactivar una inscripción. Las cuotas posteriores y confirmaciones repetidas no generan otro registro.
- Contacto: únicamente cuando `newsletterOptIn` es `true`. La casilla aparece marcada inicialmente, se puede desmarcar y no es necesaria para enviar el mensaje. La API trata una preferencia ausente como no aceptada. Se conserva la elección y su fecha en `ContactRequest`.

Se actualiza el contacto por correo con nombre, apellido cuando esté disponible, teléfono y etiquetas. Las etiquetas son aditivas: `academia`, `curso` y `curso:ID`, `masterclass` y `masterclass:CLAVE`, o `newsletter` y `contacto`. Puedes crear segmentos por estas etiquetas en Sendcorex. La inscripción a un curso o masterclass no se etiqueta como consentimiento al newsletter. No se envían mensajes de contacto, IP, contraseñas ni información de pago.

No se manda `status`, ni se modifican listas o estados de suscripción existentes: una baja o supresión de Sendcorex se conserva. Esta integración sincroniza contactos; las campañas y sus enlaces de baja se administran en Sendcorex. Los históricos se incorporan al pulsar **Sincronizar todos ahora**.

## Cola y operación

La inscripción y su trabajo de sincronización se guardan en la misma transacción. Cada 15 segundos el servidor procesa hasta 100 trabajos en una petición, con un timeout de 10 segundos. Si varios trabajos corresponden al mismo correo, se combina el contacto y sus etiquetas en ese lote. La respuesta se comprueba por correo: un error parcial no marca los otros contactos como fallidos. Las filas se reclaman mediante una concesión de 2 minutos para tolerar reinicios y varias instancias. Se usa el upsert del proveedor para tolerar entregas repetidas después de una interrupción.

La cola recibe registros incluso mientras la integración está desactivada o falta la clave; se enviarán al activarla. Tras 8 intentos fallidos se detiene ese trabajo. El admin muestra los contadores y los últimos 20 estados, actualizados cada 30 segundos, y permite reintentar los fallidos después de corregir la configuración. Los errores guardados son códigos generales, sin claves ni cuerpos de respuesta del proveedor. Un límite HTTP 429 respeta `Retry-After` numérico. Una respuesta HTTP 200 también se inspecciona para detectar errores de comando o de contacto.

El servidor usa `POST https://g.sendcorex.com/v1/contacts`, cabecera `Authorization` con la clave y comando `upsert_contacts`, según la [documentación oficial](https://docs.sendcorex.com/api-reference/contacts/contacts/upsert-contacts).

## Despliegue y verificación

1. Aplica las migraciones: `cd backend; npm run prisma:deploy`. La migración `20261021020000_sendcorex` agrega la configuración, la cola y la preferencia del formulario. El arranque de producción ya aplica las migraciones pendientes.
2. Configura la clave y activa la integración desde el admin.
3. Realiza un registro de prueba con un correo controlado y comprueba que aparezca como **Enviado** y con las etiquetas esperadas en Sendcorex.
4. Envía otro contacto con el check desmarcado y verifica que no aparezca en la cola.

`npm run test:sendcorex:integration` en backend prueba el flujo con base de datos real dentro de una transacción revertida y Sendcorex simulado; no envía contactos ni correos reales. Incluye autenticación, cifrado, consentimiento, inscripción, duplicados, errores parciales, límites, reintentos y eliminación de clave. Las pruebas de frontend verifican la casilla marcada y ambas preferencias enviadas. Las pruebas de pagos verifican que la cola se genere con la confirmación y no con cuotas posteriores.

La validación contra una cuenta real requiere la clave del propietario; las pruebas automatizadas no verifican sus permisos ni el estado real de esa cuenta.

## Directorio y sincronización masiva

**Admin → Contactos / Sendcorex** (`/admin/contactos-sendcorex`) lista los correos únicos procedentes de inscripciones activas o completadas a cursos, masterclasses, contactos con newsletter aceptado y directorios CSV importados. Incluye los históricos que todavía no tienen una fila de envío y los envíos cuyo registro de origen ya no existe. No importa a todos los usuarios por el simple hecho de tener una cuenta.

Permite buscar por nombre/correo y filtrar por estado, con paginación de 25 contactos y actualización cada 5 segundos. Cada fila muestra los orígenes, registros confirmados, última fecha de envío y errores generales. Si un correo tiene varios orígenes, aparece una sola vez; su estado refleja si alguno falta, está pendiente o falló.

**Sincronizar todos ahora** requiere la integración activa y una clave guardada. Inicia al momento una preparación en segundo plano, añade los históricos elegibles y reenvía también los contactos previamente confirmados. Se conserva el avance por lotes de 100 registros, incluso tras reiniciar el servidor. No se admiten dos preparaciones completas simultáneas. Cierra el navegador si lo necesitas: el servidor continúa.

**Enviado** significa que la API confirmó la recepción en algún momento. No se consulta todo el directorio remoto en cada visita del panel; no detecta de forma inmediata que alguien borre un contacto desde Sendcorex. La sincronización completa permite recuperarlo por upsert, preservando los estados de baja existentes. La preparación completa y el envío son dos fases: al terminar la preparación aún pueden quedar pendientes o fallidos por revisar.

## Importar un CSV

1. Abre **Admin → Contactos / Sendcorex** y descarga la plantilla.
2. Guarda tu directorio en **CSV UTF-8**, con un máximo de **10,000 filas y 2 MB** por archivo. Se aceptan coma, punto y coma o tabulador como separador. Los campos con separadores o saltos de línea deben ir entre comillas dobles; una comilla literal se escribe como `""`.
3. Usa una columna `email` o `correo` obligatoria. Se reconocen también `correo electrónico`, `email_address`, `nombre`, `name`, `first_name`, `apellidos`, `last_name`, `teléfono`, `phone` y `whatsapp`. Nombre/apellidos y teléfono son opcionales. Conserva los teléfonos como texto para no perder el signo `+` ni ceros iniciales. No se normaliza ni se inventa el código de país.
4. Selecciona el archivo y pulsa **Revisar archivo**. Verás una muestra de hasta 10 contactos, el total válido, duplicados y filas inválidas. Se informan hasta 50 errores con sus líneas; el contador incluye todos los errores. La vista previa no guarda ni envía contactos.
5. Pulsa **Importar N contactos válidos**. Se omiten las filas inválidas mostradas. Los correos se normalizan a minúsculas y los duplicados se combinan; prevalece el último nombre/teléfono no vacío del archivo. Las filas que no tienen nombre conservan el nombre anterior si ya había sido importado. Los teléfonos vacíos no borran el teléfono guardado.
6. Consulta **Últimas importaciones CSV**. El trabajo continúa en segundo plano y se puede retomar después de un reinicio. Completar la importación significa haber guardado el directorio local; la tabla de contactos muestra el envío a Sendcorex por separado.

Ejemplo:

```csv
email,nombre,apellidos,telefono
ana@example.com,Ana,Pérez,+525555555555
juan@example.com,Juan,López,+525555555556
```

Los contactos importados se envían automáticamente cuando Sendcorex está activo; mientras esté desactivado quedan pendientes. Reimportar el mismo correo actualiza su registro importado y vuelve a sincronizarlo, sin crear otro contacto por correo. Se agregan etiquetas `academia`, `importado` y `directorio`. Importar un directorio no agrega la etiqueta `newsletter` ni modifica una baja del proveedor. No se crean cuentas de alumno, pedidos o inscripciones a partir del CSV.

Los datos de cada lote y su avance se guardan en una misma transacción. Si un contacto está siendo enviado, la importación espera y reintenta el lote para no perder una actualización. Al completar el trabajo se descarta la copia temporal de las filas del CSV; se conservan el directorio, la cola y los contadores del historial. La operación exige `settings.manage` y queda registrada en auditoría sin guardar el archivo ni sus correos en el registro de auditoría.

Las migraciones adicionales son `20261021030000_sendcorex_sync` y `20261021040000_sendcorex_csv`. Para desplegar todas las funcionalidades pendientes usa el [manual acumulado](./DEPLOY-ACTUALIZACIONES-2026-10-21.md), que no requiere ejecutar el seed.
