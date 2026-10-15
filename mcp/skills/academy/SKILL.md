---
name: academy
description: Consultar y administrar Luis Toledo Academy mediante su MCP: inscritos a masterclass, cursos, alumnos, inscripciones, pedidos, cupones y configuración.
---

Usa las herramientas del MCP `academy`. Descubre las operaciones por su descripción HTTP y sus esquemas de entrada. Los parámetros se agrupan en `path`, `query` y `body` cuando correspondan. Usa las herramientas de consulta para resolver IDs antes de escribir.

- Masterclass: consultar `GET /admin/masterclass/registrations`. `total` indica los inscritos de la consulta; `items` es una página. Sin `eventKey` se consulta la masterclass actual. No añadir `search` al solicitar el total global.
- Usuarios: `GET /admin/users` admite `search`, `page`, `limit`; el total está en `pagination.total`. `POST /admin/users` crea un alumno activo con email, firstName, lastName y password de 10–128 caracteres; no verifica su correo.
- Cursos: consultar metadatos antes de crear. Preferir un borrador cuando no se haya solicitado publicar. Las inscripciones se consultan y crean en `/admin/courses/{courseId}/enrollments`, usando `userId` en el cuerpo de creación.
- Pedidos: consultar `/admin/orders/search` con `page`, `limit` y filtros opcionales `status`, `userId`, `search`; `pagination.total` indica el total. Obtener detalle con `/admin/orders/{id}`. La ruta antigua `/admin/orders` solo trae los últimos 200. Aprobar transferencias únicamente cuando el usuario haya indicado que el pago fue confirmado; aprobar puede matricular al comprador y generar correos.
- Los cambios pueden enviar correos o afectar acceso de alumnos. Si hay un error de red tras escribir, consultar el estado antes de repetir para evitar duplicados.
- Curso en vivo de noviembre 2026: usar `/admin/paid-course/summary` para inscritos y cobros, y `/admin/paid-course/plans` para saldos, órdenes y recordatorios. `activatedAt` confirma inscripción; un plan sin ese campo es un pedido de inscripción todavía sin pagar. `completedAt` indica liquidación. Filtrar `state=OVERDUE` para pagos vencidos y `option=FULL` o `INSTALLMENTS` para tipo de plan.
- Para generar la inscripción de un alumno existente, usar `POST /admin/paid-course/checkout` con `userId`, `paymentOption` (`FULL` o `INSTALLMENTS`) y `paymentMethod` (`STRIPE` o `BANK_TRANSFER`). Contado $1,790 MXN; parcialidades $500 + dos pagos de $990, total $2,480. Las órdenes restantes se generan al confirmar el apartado; no crearlas manualmente ni marcar pagadas para activar al alumno.
- Pausar o reanudar recordatorios con `PATCH /admin/paid-course/plans/{id}/reminders` y `remindersEnabled`. La aplicación envía un solo resumen semanal y detiene los avisos al liquidar. Consultar órdenes por `paymentPlanId` en `/admin/orders/search`.
- Ante 401 o 403, explicar que se revise la clave o sus permisos en Configuración → API y agentes. No pedir al usuario que pegue el secreto en la conversación. No mostrar contraseñas o claves en respuestas.

Para instalar el MCP o usar REST consultar `mcp/README.md` del proyecto. La API aplica validación y permisos en cada operación.
