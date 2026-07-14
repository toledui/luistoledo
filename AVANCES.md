# Luis Toledo Academy — avances del proyecto

Última actualización: 14 de julio de 2026.

## Resumen

Luis Toledo Academy es una plataforma LMS y de comercio electrónico construida con Next.js, NestJS, Prisma y MySQL. El repositorio contiene dos aplicaciones:

- `frontend/`: sitio público, checkout, reproductor, área del alumno y panel administrativo.
- `backend/`: API REST, autenticación, cursos, pagos, correo, archivos y persistencia.

Desde la raíz, `npm run dev` inicia ambas aplicaciones:

- Sitio: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/api/docs`

## Funcionalidad implementada

### Sitio público

- Home responsive con cursos recientes obtenidos desde la API.
- Catálogo y detalle público de cursos.
- Navbar compartido, logo dinámico, menú de usuario y minicarrito.
- Formulario de contacto con registro administrativo y Cloudflare Turnstile opcional.
- Aviso de privacidad y términos y condiciones.
- Branding dinámico: colores, tipografías, radios, logos, favicon y recursos subidos.

### Usuarios y seguridad

- Registro, inicio y cierre de sesión.
- Cookies HTTP-only de acceso y actualización.
- Verificación de correo y recuperación de contraseña.
- Perfil personal ampliado y cambio de contraseña.
- Roles, permisos, sesiones y revocación administrativa.
- Cuenta creada durante checkout para compradores nuevos.
- Superadministrador inicial configurable mediante variables de entorno.

### Cursos y aprendizaje

- Constructor de cursos, secciones, lecciones y cuestionarios.
- Portadas desde biblioteca o carga directa.
- Videos embebidos; imágenes y documentos almacenados en `uploads/`.
- Vistas previas administrativas.
- Inscripciones gratuitas, manuales y por compra.
- Reproductor con módulos desplegables, sidebar colapsable y progreso.
- Marcado de lecciones, reanudación desde la última lección y evaluaciones.
- El detalle de un curso comprado muestra “Comenzar” o “Continuar curso”.
- Certificados PDF, verificación pública y envío por correo.

### Comercio electrónico

- Carrito local y minicarrito tipo drawer.
- Checkout sin pantalla intermedia de carrito.
- Compra como invitado con creación opcional de cuenta.
- Stripe Checkout en modo prueba o producción.
- Transferencia bancaria con aprobación manual.
- Confirmación Stripe por webhook y respaldo seguro mediante `session_id`.
- Pedidos, pagos, matrículas, cupones y redenciones.
- Aplicación inmediata de cupones en checkout.
- Correos de pedido, pago aprobado y acceso al curso.

### Administración

- Resumen administrativo.
- Gestión de cursos, usuarios, medios, pedidos, cupones y matrículas.
- Bandeja de solicitudes de contacto con leído/no leído.
- Configuración general, apariencia, contacto, correo, pagos y plantillas.
- Configuración SMTP y registros de envío.
- Plantillas profesionales y variables transaccionales.
- Auditoría básica de cambios en configuración.

## Persistencia y archivos

- Base de datos MySQL administrada con Prisma.
- Migraciones en `backend/prisma/migrations/`.
- Archivos persistentes en `backend/uploads/`:
  - `branding/`
  - `media/`
  - `certificates/`

En producción, `uploads/` debe conservarse entre despliegues y respaldarse junto con la base de datos.

## Comandos habituales

```bash
npm run dev
npm run build
npm run lint
npm test
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:seed
```

## Verificación actual

- Compilación del frontend y backend operativa.
- Lint habilitado en ambos proyectos.
- Pruebas unitarias con Vitest y Jest.
- Migraciones aplicadas sobre la base de desarrollo.

## Pendientes recomendados antes de producción

- Revisión legal del aviso de privacidad, términos, identidad fiscal, domicilio y reembolsos.
- Configurar dominio, HTTPS, cookies seguras y CORS definitivo.
- Configurar Stripe Live y webhook público.
- Configurar SMTP real y verificar SPF, DKIM y DMARC.
- Crear widget Cloudflare Turnstile para el dominio definitivo.
- Definir respaldos automáticos de MySQL y `uploads/`.
- Incorporar monitoreo, alertas y rotación de logs.
- Ejecutar pruebas E2E completas del registro, compra, acceso, progreso y certificados.

