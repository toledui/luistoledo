# Manual de API y Swagger

## Acceso

En desarrollo:

- API base: `http://localhost:4000/api/v1`
- Swagger UI: `http://localhost:4000/api/docs`
- Salud: `http://localhost:4000/api/v1/health`

Swagger se configura en `backend/src/main.ts`. El prefijo REST predeterminado es `api/v1`, mientras que la interfaz Swagger se publica en `api/docs`.

## Iniciar la API

Desde la raíz:

```bash
npm run dev
```

Sólo backend:

```bash
npm run start:dev --prefix backend
```

## Formato y autenticación

### Curso en vivo: contado y parcialidades

- Landing no listada: `/implementa-tu-asistente-ia`, excluida del catálogo público y marcada `noindex`.
- Oferta pública sin enlace de WhatsApp: `GET /paid-course`. Sesiones: 21 y 28 de noviembre y 5 de diciembre de 2026, 9:00–13:00 CDMX. Cierre de nuevas inscripciones: 18 de noviembre, 23:59:59 CDMX.
- `POST /checkout` admite `{ "program": "asistente-ia", "paymentOption": "FULL" | "INSTALLMENTS", "paymentMethod": "STRIPE" | "BANK_TRANSFER" }` con sesión del alumno. Reutiliza cuentas y checkout existentes, sin modificar el carrito normal. Importes fijados en el backend: $1,790 contado o $500 de apartado y dos órdenes de $990 (total $2,480). No admite cupones para esta oferta.
- Confirmar el pago inicial activa la inscripción y encola el correo de bienvenida con WhatsApp y el aviso administrativo en la misma transacción. En parcialidades se crean las órdenes 2 y 3 con vencimiento el 21 y 28 de noviembre a las 9:00 CDMX. Stripe y transferencias usan una confirmación atómica compartida para evitar duplicados. Los pagos restantes son manuales; no son cargos recurrentes de Stripe.
- `GET /orders` y `GET /orders/:id` incluyen `paymentPlan`, `installmentNumber` y `dueAt`. `POST /orders/:id/resume-payment` inicia o recupera una sesión Stripe de esa orden. `PATCH /paid-course/reminders` con `{ "remindersEnabled": false }` permite al alumno pausar sus avisos.
- Administración/MCP, con `orders.manage`: `GET /admin/paid-course/summary`, `GET /admin/paid-course/plans`, `GET /admin/paid-course/plans/:id`, `PATCH /admin/paid-course/plans/:id/reminders`, `POST /admin/paid-course/checkout`. El listado acepta `page`, `limit`, `search`, `option` y `state`. `GET /admin/orders/search` también acepta `paymentPlanId`.
- Panel administrativo: `/admin/inscripciones-ia`. Se conservan las herramientas de aprobación de transferencias existentes.
- Recordatorios: cron de la aplicación a las 10:00 CDMX, como máximo un resumen cada 7 días por plan activo con saldo vencido o próximo (7 días). Se detienen al liquidar o al pausarlos. Los correos pendientes se revalidan antes de enviarse; una cola de recordatorio antigua se cancela si ya se pagó o se pausó. Es necesario mantener el backend activo.

Aplicar migraciones con `npm run db:deploy` al desplegar y reiniciar el backend y MCP. Validación adicional con MySQL local: `npm run test:paid-course:integration --prefix backend`, que revierte todos sus datos de prueba y no envía correos.

### Agentes, API keys y Hermes MCP

Las claves se crean y revocan en **Configuración → API y agentes** (`/admin/configuracion/api`). Se envían como `Authorization: Bearer lta_...` a las rutas administrativas. Cada área tiene permisos de lectura y escritura independientes, con expiración opcional. El secreto se muestra solo al crearlo; únicamente se guarda su hash. Los permisos también dependen de los permisos actuales y del estado activo de su propietario.

La gestión de claves usa `GET /admin/settings/api-keys`, `GET /admin/settings/api-keys/scopes`, `POST /admin/settings/api-keys` y `POST /admin/settings/api-keys/:id/revoke`; requiere sesión web y `settings.manage`. El cuerpo de creación contiene `name`, `scopes` y opcionalmente `expiresAt` en ISO 8601.

Se añade `POST /admin/users` para crear alumnos activos con `email`, `firstName`, `lastName` y `password`. No se conceden roles administrativos ni se marca el correo como verificado. Las claves no pueden administrar roles ni sesiones.

Para pedidos completos, usar `GET /admin/orders/search?page=1&limit=25`, con filtros opcionales `status`, `userId`, `search` (número o correo), y total en `pagination.total`. `GET /admin/orders/:id` obtiene el detalle. La ruta existente `GET /admin/orders` conserva su lista de los últimos 200 pedidos.

La consulta de registros de masterclass admite `eventKey` opcional para consultar otros eventos; sin él se usa el evento actual. El campo `total` siempre cuenta la consulta completa, no solo la página.

El servidor MCP y las instrucciones verificadas para Hermes están en [mcp/README.md](./mcp/README.md). El MCP descubre las operaciones y sus esquemas desde `/api/docs-json`; las cargas multipart siguen disponibles por REST.

### Registro de masterclass

La landing pública está en `/masterclass` y la bandeja administrativa en `/admin/masterclass`.

- `GET /api/v1/masterclass`: fecha, disponibilidad del registro y configuración pública de Turnstile.
- `POST /api/v1/masterclass/registrations`: recibe `name`, `email`, `whatsapp` (10 dígitos de México o número con clave de país, con o sin `+`; acepta espacios, paréntesis, puntos y guiones), `consent: true` y `turnstileToken` si está activado. Normaliza los números locales de 10 dígitos agregando `+52` y conserva la clave de país cuando se incluye (hasta 15 dígitos). No requiere cuenta. Devuelve `success` y `whatsappGroupUrl` después de persistir. El registro cierra al inicio del evento.
- `GET /api/v1/admin/masterclass/registrations?page=1&limit=25&search=texto`: lista paginada, conteo y estado del aviso de cada inscripción. Requiere sesión y `settings.manage`.
- `POST /api/v1/admin/masterclass/registrations/:id/notify`: intenta el aviso pendiente o fallido usando el destinatario configurado actualmente. Requiere sesión y `settings.manage`.

Un correo solo puede registrarse una vez por evento. Reenviar el formulario confirma el registro sin modificar los datos originales ni duplicar avisos. El registro y su aviso se guardan en una transacción; se intenta enviar de inmediato y la cola reintenta fallos SMTP. El destinatario es el de Configuración → Contacto, con el correo general/soporte como respaldo. En modo LOG no se envían correos reales. Si no hay destinatario, la inscripción se conserva y el admin permite enviar el aviso después de configurar el correo.

El evento actual está definido en `backend/src/masterclass/masterclass.constants.ts` y su presentación en `frontend/src/lib/masterclass.ts`: 29 de octubre de 2026, 20:00, `America/Mexico_City` (UTC−6). Al cambiar de edición, actualiza ambos archivos y utiliza una nueva clave de evento para conservar el historial.

Cada nueva inscripción también guarda un correo `MASTERCLASS_CONFIRMATION` dirigido al participante, con fecha, hora y enlace al grupo de WhatsApp. Se crea en la misma transacción del registro y se intenta enviar inmediatamente, independientemente de que exista un destinatario administrativo. Usa el proveedor configurado y los reintentos de la cola de correo. Los envíos se consultan en los registros de correo; reenviar el formulario no duplica la confirmación.

### Sesión y permisos

- Las solicitudes y respuestas utilizan JSON, excepto cargas `multipart/form-data` y descargas.
- La autenticación se basa en cookies HTTP-only (`lt_access` y `lt_refresh` por defecto).
- Desde navegador o `fetch`, utiliza `credentials: "include"`.
- Los endpoints administrativos verifican sesión, roles y permisos.
- Un `401` indica sesión ausente o vencida; un `403`, permisos insuficientes.

Ejemplo de inicio de sesión con `curl` conservando cookies:

```bash
curl -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"CONTRASENA"}' \
  http://localhost:4000/api/v1/auth/login

curl -b cookies.txt http://localhost:4000/api/v1/auth/me
```

Renovar sesión:

```bash
curl -i -b cookies.txt -c cookies.txt \
  -X POST http://localhost:4000/api/v1/auth/refresh
```

## Uso desde JavaScript

```ts
const response = await fetch("http://localhost:4000/api/v1/courses", {
  credentials: "include",
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message ?? "Error de API");
}

const courses = await response.json();
```

POST autenticado:

```ts
await fetch("http://localhost:4000/api/v1/learning/lessons/LESSON_ID/complete", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
```

## Endpoints principales

Todos los paths siguientes se agregan después de `/api/v1`.

### Públicos

| Método | Ruta | Uso |
|---|---|---|
| GET | `/health` | Estado de la API y base de datos |
| GET | `/settings/public` | Configuración pública y branding |
| GET | `/courses` | Cursos publicados; acepta `search`, `category`, `level`, `limit` |
| GET | `/courses/:slug` | Detalle público del curso |
| GET | `/catalog/categories` | Categorías publicadas |
| GET | `/payments/methods` | Métodos de pago habilitados |
| POST | `/coupons/validate` | Validar cupón contra una lista de cursos |
| GET | `/contacts/settings` | Configuración pública de Turnstile |
| POST | `/contacts` | Crear solicitud de contacto |
| GET | `/certificates/verify/:code` | Verificar certificado |

Ejemplo de cupón:

```bash
curl -X POST http://localhost:4000/api/v1/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"PROMO10","courseIds":["COURSE_ID"]}'
```

### Autenticación y cuenta

| Método | Ruta |
|---|---|
| POST | `/auth/register` |
| POST | `/auth/email-status` |
| POST | `/auth/checkout-account` |
| POST | `/auth/verify-email` |
| POST | `/auth/resend-verification` |
| POST | `/auth/forgot-password` |
| POST | `/auth/reset-password` |
| POST | `/auth/login` |
| POST | `/auth/refresh` |
| GET | `/auth/me` |
| PATCH | `/auth/profile` |
| POST | `/auth/change-password` |
| POST | `/auth/logout` |
| POST | `/auth/logout-all` |

### Alumno

| Método | Ruta | Uso |
|---|---|---|
| GET | `/enrollments/me` | Cursos del alumno |
| GET | `/enrollments/course/:slug` | Detalle cuando tiene acceso |
| POST | `/enrollments/free/:courseId` | Inscripción gratuita |
| GET | `/learning/courses/:slug` | Reproductor y progreso |
| POST | `/learning/lessons/:id/complete` | Completar lección |
| GET | `/learning/lessons/:lessonId/quiz` | Obtener cuestionario |
| POST | `/learning/lessons/:lessonId/quiz/submit` | Enviar respuestas |
| GET | `/certificates/me` | Certificados del alumno |
| GET | `/certificates/:id/download` | Descargar PDF |

### Carrito, pedidos y Stripe

| Método | Ruta | Uso |
|---|---|---|
| GET | `/cart` | Carrito persistente del usuario |
| POST | `/cart/items` | Agregar `{ courseId }` |
| DELETE | `/cart/items/:id` | Eliminar item persistente |
| DELETE | `/cart` | Vaciar carrito |
| POST | `/checkout` | Crear pedido y pago |
| POST | `/payments/stripe/confirm` | Confirmar retorno de Stripe mediante `orderId` y `sessionId` |
| POST | `/payments/webhooks/stripe` | Webhook firmado de Stripe |
| GET | `/orders` | Pedidos del usuario |
| GET | `/orders/:id` | Detalle de un pedido propio |

El webhook de Stripe requiere el cuerpo crudo y el encabezado `stripe-signature`. No debe invocarse manualmente ni colocarse detrás de middleware que modifique el cuerpo.

### Administración

Los endpoints `/admin/*` requieren cookies válidas y permisos específicos.

- `/admin/courses`: cursos, secciones y lecciones.
- `/admin/users`: usuarios, roles, estados y sesiones.
- `/admin/media`: biblioteca, cargas e integración de video.
- `/admin/orders`: pedidos y aprobación de transferencias.
- `/admin/coupons`: cupones.
- `/admin/settings`: configuración general y branding.
- `/admin/email`: SMTP, pruebas, logs y cola.
- `/admin/email/templates`: plantillas transaccionales.
- `/admin/contacts`: solicitudes de contacto.
- `/admin/contact-settings`: destinatario y Turnstile.

Swagger muestra los DTO, parámetros y esquemas disponibles. Algunos controladores todavía pueden necesitar más decoradores `@ApiProperty` para que todos los ejemplos aparezcan completos.

## Carga de archivos

Ejemplo de imagen a la biblioteca:

```bash
curl -b cookies.txt \
  -X POST http://localhost:4000/api/v1/admin/media/upload \
  -F "file=@./portada.webp" \
  -F "name=Portada del curso"
```

Los archivos se sirven públicamente desde `/uploads/...`. El límite y los MIME permitidos dependen del endpoint.

## Errores

NestJS utiliza códigos HTTP estándar. Respuesta típica:

```json
{
  "statusCode": 400,
  "message": "Descripción del error",
  "error": "Bad Request"
}
```

`message` puede ser texto o arreglo cuando falla validación. La aplicación frontend normaliza ambos formatos.

## Swagger y autorización

1. Abre `http://localhost:4000/api/docs`.
2. Inicia sesión mediante `/api/v1/auth/login` en otra pestaña del mismo host o usa `curl`.
3. Como la autenticación usa cookies, Swagger enviará la cookie cuando el navegador la tenga y coincidan dominio, protocolo y política SameSite.
4. En producción utiliza únicamente Swagger por HTTPS y considera restringirlo por red, autenticación adicional o deshabilitarlo si no será público.

## Versionado

La API utiliza el prefijo fijo `/api/v1`. Cambios incompatibles deben publicarse bajo un nuevo prefijo o conservar compatibilidad con los consumidores existentes.

