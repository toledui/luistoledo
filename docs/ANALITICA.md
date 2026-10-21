# Analítica: instalación y operación

La aplicación integra registro propio, GA4 (GTM o etiqueta directa), Meta Pixel,
Conversions API y consultas de solo lectura a GA4 y Search Console. El código
no crea cuentas externas ni publica automáticamente un contenedor GTM.

## Instalar

1. En `backend`: `npm run prisma:generate` y `npm run prisma:deploy`.
2. Compilar y reiniciar backend y frontend según `DEPLOY.md`.
3. Entrar con un superadministrador a `/admin/configuracion/analitica`.
4. Introducir IDs, secretos y credenciales. La migración concede `analytics.read`
   y `analytics.ip.read` a `SUPER_ADMIN` sin ejecutar el seed ni cambiar contraseñas.
   Otros roles requieren una asignación explícita de esos permisos.

La analítica propia está habilitada por defecto, pero no recopila visitas antes
de una elección afirmativa. Analítica y publicidad son categorías independientes.
La configuración pública contiene únicamente IDs y estado; los secretos se cifran
con `APP_ENCRYPTION_KEY` y nunca se devuelven al navegador.

## Google Analytics y Tag Manager

- Guardar el ID de medición `G-…`.
- Para GTM, guardar además `GTM-…`, importar `docs/gtm-container.json` en un
  workspace (combinar, revisando conflictos), comprobarlo en Preview y publicar.
  El contenedor toma `ga_measurement_id` del dataLayer de la aplicación.
  Se puede regenerar con `node scripts/generate-gtm.cjs` desde la raíz.
- Sin ID GTM se utiliza la etiqueta directa de Google. No instalar otra etiqueta
  Google por fuera de este mecanismo.
- En el flujo web GA4, desactivar la medición mejorada automática de páginas,
  scroll y formularios/clics para evitar duplicados y captura automática de URLs.
  La aplicación emite sus propios eventos sanitizados.
- Crear un secreto de Measurement Protocol y guardarlo en el admin. Los registros,
  leads, compras y lecciones completadas se envían desde el servidor. No crear
  etiquetas GTM adicionales para repetir esas conversiones.
- Confirmar en DebugView que hay una visita por navegación de Next.js. Comprobar
  los parámetros `page_location`, `page_referrer`, moneda, productos y valor.
- Marcar como eventos clave `generate_lead` y `sign_up` según el objetivo comercial.
  Las compras se identifican por el ID de pedido como `transaction_id`.

GA4 requiere `client_id` y `session_id` reales obtenidos de su etiqueta para enviar
conversiones de servidor con una sesión válida. Cuando GTM está bloqueado o aún no
está publicado, el registro propio sigue funcionando, y el diagnóstico puede
mostrar `NOT_CONFIGURED`. No se inventan identificadores para aparentar conexión.

## Meta

Guardar ID de píxel/dataset y token de Conversions API. La versión Graph API es
configurable; comprobar su vigencia en Meta al activar la integración. No agregar
otro píxel en GTM: la aplicación carga el suyo después del consentimiento de publicidad.

Meta recibe PageView, ViewContent, AddToCart e InitiateCheckout desde el navegador;
Lead y CompleteRegistration también tienen envío servidor con el mismo `event_id`.
Purchase se emite únicamente desde el servidor al confirmar el pago. Las páginas
con tokens de verificación o Stripe no emiten eventos del píxel del navegador.
Validar en Meta Events Manager / Test Events y revisar diagnósticos de deduplicación.
Usar propiedades/datasets de pruebas durante la validación, antes de introducir
las credenciales de producción. No colocar tokens ni secretos en variables públicas.

## Reportes dentro del administrador

`/admin/analitica` contiene registro propio, diagnósticos de envíos, visitas e IP
(permiso adicional), y reportes de Google. Para activar estos últimos:

1. Habilitar Google Analytics Data API y Search Console API en Google Cloud.
2. Crear una cuenta de servicio y otorgar al correo de esa cuenta acceso lector
   a la propiedad GA4 y acceso de lectura a la propiedad de Search Console.
3. Guardar su JSON en el campo privado del admin, el ID numérico de propiedad GA4
   y el identificador exacto de Search Console: `sc-domain:…` o prefijo HTTPS.

Se consulta desde el backend, con caché de 15 minutos. La ciudad/país vienen de
GA4 de forma agregada y aproximada; no se geolocaliza cada IP usando servicios
externos. No se suman conteos de Google con los propios. Los datos tienen
latencias y reglas distintas. Las gráficas propias por día usan UTC explícitamente.

## Atribución y datos disponibles

- Fuente actual: UTM explícito, referente disponible o directo/desconocido.
- Clasificación específica de ChatGPT, Gemini, Perplexity, Claude y Copilot;
  el dominio se valida completo para no confundir dominios que lo imitan.
- Primera fuente por navegador y última fuente no directa guardadas en servidor.
  Las conversiones propias se atribuyen a la última fuente no directa conocida.
- Cada sesión inactiva 30 minutos genera un nuevo ID; los visitantes se estiman
  por navegador, no por IP ni mediante fingerprinting.
- `utm_term` es un término configurado por la campaña, no la consulta individual.
  Search Console aporta consultas agregadas y puede omitir consultas por privacidad.
  No están disponibles los prompts de ChatGPT/Gemini ni la consulta orgánica de cada persona.
- No hay información histórica de visitas anteriores a la instalación. Las ventas
  sin consentimiento/atribución permanecen en Pedidos, aunque no figuren en analítica.

## Fiabilidad de pagos, reintentos y retención

El evento y la cola de compra se escriben dentro de la misma transacción que
confirma el pago. Un webhook o aprobación repetidos no crean otro evento. Cada
abono tiene su propio pedido/transaction_id y solo suma el importe cobrado;
los abonos siguientes heredan la atribución del pedido inicial cuando existe.
El navegador no genera compras al abrir o recargar la página de éxito.

La cola reclama trabajos de forma condicional, recupera trabajos interrumpidos
y reintenta con espera creciente. Cada proveedor tiene su propio estado. Se
descartan eventos revocados y se marca fallo cuando expiran o son rechazados.
Una respuesta HTTP aceptada por GA4 no prueba que el evento haya sido procesado:
usar DebugView y los reportes externos para verificar la activación final.
La entrega es al menos una vez; Purchase usa transaction_id/event_id estables.

No se implementa un flujo comercial de devoluciones en esta entrega: los importes
del panel son cobros brutos atribuidos. Antes de usar ingresos netos se necesita
conectar las devoluciones reales con `refund`, sin inferirlas de una visita.

La IP se toma de `request.ip`, se cifra y requiere permiso `analytics.ip.read`.
Si hay proxy inverso, configurar **solo sus redes reales** en `TRUSTED_PROXY_CIDRS`
(por ejemplo `loopback` si Nginx está en el mismo servidor y el backend no está
expuesto directamente). No confiar indiscriminadamente en `X-Forwarded-For`.
La limpieza corre a las 03:00 de Ciudad de México: IP 7 días por defecto,
sesiones/eventos 90 días; límites configurables de 30 y 365 días respectivamente.
Revocar borra identificadores publicitarios e IP de las sesiones del navegador,
detiene nuevos eventos y cancela entregas pendientes al procesarlas. No elimina
automáticamente registros históricos ni datos ya recibidos por proveedores.

## Validación antes de campañas

- Consentimiento pendiente / solo necesarias: no hay peticiones de medición ni scripts de proveedores.
- Analítica sin publicidad: registro propio y Google; no Meta.
- Publicidad sin analítica: Meta; no visitas en reportes propios ni Google.
- Navegar rutas, volver atrás y recargar: una vista por navegación.
- Formularios fallidos: sin lead; registros repetidos de masterclass: sin lead duplicado.
- Compra Stripe, transferencia y abonos: importe correcto y un evento por pedido pagado.
- Revocación: no se envían nuevos eventos de las categorías rechazadas.
- Sin sesión admin: endpoints privados rechazan el acceso; IP requiere ambos permisos.
- Cambios en configuraciones de proveedores requieren recargar el sitio público.

Documentación oficial: [GTM y navegación SPA](https://developers.google.com/analytics/devguides/collection/ga4/measure-spa-gtm),
[Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference),
[Consent Mode](https://developers.google.com/tag-platform/security/guides/consent),
[Search Console](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).
