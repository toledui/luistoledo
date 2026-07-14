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

