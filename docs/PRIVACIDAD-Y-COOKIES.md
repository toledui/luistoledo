# Aviso de privacidad y cookies

Actualización: 21 de octubre de 2026.

- Aviso integral: `/aviso-de-privacidad`. Responsable: **LUIS TOLEDO**. Domicilio proporcionado por el titular: Carretera Estatal 210, km 5.379, Bodega 3, Jesús María, El Marqués, Querétaro, C.P. 76243, México. Correo: `contacto@luistoledo.com.mx`, usado previamente en el sitio. Verifica que esa cuenta se supervise para atender solicitudes.
- Política y controles: `/politica-de-cookies`. Acceso directo a las preferencias: `/politica-de-cookies#preferencias`.
- `/privacidad` responde con redirección permanente 308. Se actualizaron enlaces del formulario de contacto, masterclass, pie de página, selector y sitemap.
- Se retiró el botón flotante. Se conserva el selector inicial y se puede cambiar la decisión en la página de cookies.
- Las categorías opcionales empiezan desmarcadas. La nueva versión `2026-10-21.2` se usa en frontend y configuración pública del backend; una elección anterior necesita renovarse antes de que vuelva a iniciarse la medición del navegador.

## Alcance contrastado con el código

El aviso describe cuentas y perfil, autenticación, cursos, progreso, exámenes y certificados verificables; compras, cuotas y Stripe; contacto y masterclasses; comunicaciones operativas y newsletter; Sendcorex, etiquetas, sincronización de históricos, importaciones CSV y sus datos temporales; WhatsApp y visibilidad de los grupos; Google Analytics, Tag Manager, Meta Pixel/CAPI y consentimiento; IP, procedencia, almacenamiento del navegador y retención propia; Cloudflare Turnstile; vídeos incorporados; acceso administrativo, proveedores y solicitudes ARCO.

La página de cookies diferencia datos necesarios, analítica y publicidad. El inventario de autenticación y almacenamiento propio proviene de `auth.controller.ts`, `analytics.ts` y `cart-context.tsx`. Los identificadores y duraciones de terceros se describen como dependientes de su configuración; no se presenta una auditoría en vivo de todas las cookies ni se afirma que el selector controle las conexiones técnicas de los reproductores, pagos o captcha.

Las preferencias de cookies y las bajas de comunicaciones son independientes. El aviso no convierte una importación CSV o una inscripción en consentimiento general a marketing. Una política publicada no demuestra por sí sola que un directorio tenga permiso de uso, que los contratos con proveedores sean adecuados o que una solicitud haya sido atendida: su operación corresponde al responsable.

## Fundamento consultado

Se consultó la [Ley Federal de Protección de Datos Personales en Posesión de los Particulares, texto vigente publicado por la Cámara de Diputados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf), con reforma de 14 de noviembre de 2025. Se revisaron los requisitos del aviso y los procedimientos aplicables. El texto debe someterse a validación jurídica del responsable para confirmar su correspondencia con la operación real y sus proveedores; no constituye garantía de cumplimiento ni sustituye la atención de derechos.

## Despliegue y verificación

No requiere migración ni seed adicional. Compila y reinicia frontend y backend, conservando los archivos de entorno y la clave de cifrado. Usa el [manual acumulado](./DEPLOY-ACTUALIZACIONES-2026-10-21.md) si todavía están pendientes las entregas anteriores.

Comprueba el 308 de `/privacidad`, ambas páginas nuevas, sus enlaces en el pie y en `/sitemap.xml`. En un navegador sin elección o con versión anterior, verifica que no se carguen las etiquetas opcionales hasta aceptar. Elige una categoría, entra a la página de cookies y cambia a solo necesarias; comprueba que se actualice la decisión, se cierre cualquier selector abierto y se deje de emitir nueva medición opcional desde la integración. Revisa las conexiones de servicios externos por separado.
