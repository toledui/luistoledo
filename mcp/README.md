# Luis Toledo Academy MCP para Hermes

1. Desplegar el backend con `npm run prisma:deploy --prefix backend` y `npm run build --prefix backend` y reiniciarlo. Publicar también el frontend actualizado.
2. Entrar con tu cuenta administrativa a **Configuración → API y agentes** (`/admin/configuracion/api`). Crear una clave con los permisos necesarios y copiarla; solo se muestra una vez. Para consultas, seleccionar únicamente lectura. Para crear cursos y alumnos, habilitar además escritura de cursos y usuarios.
3. En el equipo donde corre Hermes, copiar la carpeta `mcp` e instalar Node.js 20 o posterior. Ejecutar `npm ci --prefix /ruta/a/mcp`.
4. Guardar `ACADEMY_API_KEY=lta_...` en `~/.hermes/.env` (o en el perfil activo). Añadir el bloque de [hermes.config.example.yaml](./hermes.config.example.yaml) a `~/.hermes/config.yaml`, ajustando la ruta absoluta de `server.mjs` y `ACADEMY_API_URL` al backend desplegado. No colocar la clave en mensajes ni en Git.
5. Reiniciar Hermes o ejecutar `/reload-mcp`. Pedir: “¿Cuántos inscritos tiene la masterclass?”, “Lista los pedidos”, “Crea un curso en borrador” o “Inscribe este usuario al curso”.

El MCP usa el SDK oficial, transporte **stdio** y herramientas separadas por operación, generadas desde OpenAPI (`/api/docs-json`). El backend debe estar accesible al iniciar Hermes. Las respuestas 401 indican clave inválida, vencida, revocada o propietario inactivo; 403 indica permisos insuficientes. Las herramientas disponibles en el catálogo no sustituyen los permisos: el backend evalúa cada llamada. `ACADEMY_READ_ONLY=true` oculta todas las herramientas de escritura adicionalmente. `ACADEMY_OPENAPI_URL` permite cambiar la URL de OpenAPI si el proxy la publica en otro lugar.

## Operaciones

Todas las rutas son relativas a `ACADEMY_API_URL`, normalmente `https://backend/api/v1`.

| Operación | Ruta | Scope |
|---|---|---|
| Inscritos masterclass, total y búsqueda | GET `/admin/masterclass/registrations?page=1&limit=25&eventKey=...` | `masterclass:read` |
| Reintentar notificación de un registro | POST `/admin/masterclass/registrations/{id}/notify` | `masterclass:write` |
| Listar / consultar cursos y metadatos | GET `/admin/courses`, `/{id}`, `/metadata` | `courses.manage:read` |
| Crear / editar / duplicar / eliminar cursos, secciones y lecciones | POST / PATCH / DELETE `/admin/courses/...` | `courses.manage:write` |
| Inscritos y progreso de un curso | GET `/admin/courses/{courseId}/enrollments` | `courses.manage:read` |
| Inscribir alumno | POST `/admin/courses/{courseId}/enrollments` con `{ "userId": "..." }` | `courses.manage:write` |
| Editar / eliminar inscripción | PATCH / DELETE `/admin/enrollments/{id}` | `courses.manage:write` |
| Buscar / consultar usuarios | GET `/admin/users?search=...`, `/{id}` | `users.manage:read` |
| Crear alumno activo | POST `/admin/users` con `email`, `firstName`, `lastName`, `password` (10–128 caracteres) | `users.manage:write` |
| Cambiar estado de usuario | PATCH `/admin/users/{id}/status` | `users.manage:write` |
| Pedidos con total, filtros y paginación | GET `/admin/orders/search?page=1&limit=25&status=PAID&search=...` | `orders.manage:read` |
| Detalle de pedido con artículos, cliente y pagos | GET `/admin/orders/{id}` | `orders.manage:read` |
| Aprobar transferencia bancaria | POST `/admin/orders/{orderId}/approve-transfer` | `orders.manage:write` |
| Consultar / crear cupones | GET / POST `/admin/coupons` | `orders.manage:read` / `orders.manage:write` |
| Multimedia | Rutas `/admin/media` | `media.manage:read` / `media.manage:write` |
| Configuración, contacto, correo y plantillas | Rutas administrativas correspondientes en Swagger | `settings.manage:read` / `settings.manage:write` |

El catálogo incluye otras operaciones administrativas existentes, como cuestionarios, con los permisos que declara cada ruta. Los archivos binarios se suben por REST multipart, no por este MCP. La gestión de API keys, roles y sesiones requiere la sesión web. Crear un usuario por API siempre asigna `STUDENT`; no concede roles administrativos ni marca su correo como verificado.

La clave conserva únicamente un hash SHA-256 en base de datos. Cada llamada verifica expiración, revocación, estado del propietario, permisos actuales del propietario y scopes de la clave. Lectura y escritura se conceden independientemente. La actividad autorizada queda en el historial de configuración con ID de clave, ruta y estado HTTP, sin cuerpos ni secretos. Para rotar una clave, crear otra, cambiarla en Hermes y revocar la anterior desde Settings.

Para contar inscritos a masterclass, usar `total`, no la longitud de `items` (paginados). Sin `eventKey` se consulta la masterclass actual. En usuarios usar `pagination.total`; en inscripciones de curso la respuesta actual es una lista. Consultar OpenAPI para cuerpos completos y enums.

Para pedidos usar `/admin/orders/search`, con `pagination.total` y filtros opcionales `status`, `userId` y `search` (número o correo). `/admin/orders` conserva los últimos 200 pedidos por compatibilidad con el panel.

## Curso en vivo y parcialidades

La landing no anunciada es `/implementa-tu-asistente-ia` (sin enlaces desde home, navegación pública o catálogo; `noindex`). Inicio: 21 de noviembre de 2026, tres sábados hasta el 5 de diciembre, 9:00–13:00 CDMX. Inscripciones hasta el 18 de noviembre de 2026 a las 23:59:59 CDMX.

- Contado: $1,790 MXN. Parcialidades: apartado de $500 + $990 el 21 de noviembre y $990 el 28 de noviembre (9:00 CDMX), total $2,480 MXN.
- Al confirmarse el primer pago se activa la inscripción y se generan una sola vez las dos órdenes restantes. El contado no genera más órdenes. Se usa el checkout y la creación de cuentas existentes; el servidor determina los importes.
- Se encolan confirmación al alumno con el grupo de WhatsApp y aviso al propietario. El destinatario administrativo usa Contacto → correo destinatario; como respaldo, Correo → notificación administrativa y los correos generales. No se expone la invitación del grupo en la API pública ni en la landing.
- La aplicación revisa recordatorios diariamente a las 10:00 CDMX y encola como máximo un resumen por plan cada siete días, cuando hay pagos vencidos o a vencer en los próximos siete días. No cobra tarjetas automáticamente. Los avisos terminan al liquidar y se pueden pausar desde el panel del alumno o la administración. La cola habitual reintenta errores de entrega.
- El backend debe permanecer en ejecución para procesar correos y recordatorios. Las nuevas funciones usan el scope existente `orders.manage:read` / `orders.manage:write`.

| Operación MCP / REST administrativa | Uso |
|---|---|
| GET `/admin/paid-course/summary` | Inscritos confirmados, contado/parcialidades, cobrado, por cobrar y órdenes vencidas |
| GET `/admin/paid-course/plans?page=1&limit=25&state=ACTIVE` | Planes con alumno, órdenes, pagos, saldo y recordatorios; filtros `search`, `option=FULL/INSTALLMENTS`, `state=PENDING/ACTIVE/COMPLETED/OVERDUE` |
| GET `/admin/paid-course/plans/{id}` | Detalle de un plan |
| PATCH `/admin/paid-course/plans/{id}/reminders` | `{ "remindersEnabled": false }` pausa avisos; `true` los activa |
| POST `/admin/paid-course/checkout` | `{ "userId": "...", "paymentOption": "FULL" o "INSTALLMENTS", "paymentMethod": "STRIPE" o "BANK_TRANSFER" }`; crea o recupera el pedido de inscripción y devuelve enlace de pago si es tarjeta |
| GET `/admin/orders/search?paymentPlanId=...` | Consultar las órdenes de ese plan |
| POST `/admin/orders/{orderId}/approve-transfer` | Confirmar una transferencia verificada; también funciona para apartado y parcialidades |

Reiniciar el MCP o usar `/reload-mcp` después de desplegar para descubrir estas herramientas. El panel administrativo está en `/admin/inscripciones-ia`. Las acciones de creación de cuentas, confirmación de transferencias y cambios financieros requieren autorización del usuario; nunca marcar pagado basándose únicamente en una afirmación de un tercero.

La prueba manual `npm run test:paid-course:integration --prefix backend` verifica el ciclo completo contra MySQL con una transacción que se revierte: no conserva alumnos, pedidos o correos de prueba y no usa SMTP.

## REST sin MCP

```bash
curl "$ACADEMY_API_URL/admin/masterclass/registrations?limit=1" \
  -H "Authorization: Bearer $ACADEMY_API_KEY"
```

## Guía opcional para el agente

Copiar `skills/academy/SKILL.md` al directorio de habilidades de Hermes, si se desea aportar instrucciones de dominio además de las herramientas MCP. No es necesario instalar la habilidad para usar el MCP.

Referencias oficiales: [Hermes MCP](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/mcp-config-reference.md), [SDK MCP](https://ts.sdk.modelcontextprotocol.io/server).
