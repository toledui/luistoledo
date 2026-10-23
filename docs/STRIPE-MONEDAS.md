# Selector de moneda en la web con Stripe Checkout

«Continuar a Stripe» conserva el pago alojado por Stripe. El sitio incorpora un selector en la cabecera sticky (también visible en móvil), carrito, checkout y pedidos pendientes. Cerrado muestra únicamente el código; al abrirlo permite buscar por código o nombre. Los precios del inicio, catálogo, detalle y programa se convierten a la moneda elegida. El frontend no carga SDK ni campos de tarjeta.

El país se resuelve en el backend mediante una base GeoIP local. La IP no se envía al proveedor de tipos de cambio. La elección manual del navegador tiene prioridad sobre el país detectado y se guarda en `lta_currency_v1`. Si no se reconoce el país o su moneda no está admitida, se usa MXN. En localhost es normal que no haya un país detectable; el selector manual sigue funcionando.

La API consulta la intersección de `supported_payment_currencies` del país de la cuenta Stripe y los tipos de cambio disponibles. El selector de la web limita esa respuesta a MXN, USD, CAD, BRL, ARS, CLP, COP, PEN, UYU, PYG, BOB, CRC, GTQ, HNL, NIO, DOP y EUR, en ese orden. Una moneda de esta lista solo aparece cuando está disponible en la respuesta del servidor. Si una preferencia guardada o el país detectado corresponde a una moneda fuera de la lista, se utiliza una opción válida o MXN. No se promete que todas las tarjetas o métodos de pago acepten todas esas monedas.

## Tipo de cambio y cobro

Se usa ExchangeRate-API mediante su endpoint HTTPS público de base MXN. La actualización es diaria y la consulta se realiza exclusivamente en el servidor, con caché, timeout y límite de antigüedad de 48 horas. Se muestra la atribución exigida por el proveedor en las páginas que presentan precios convertidos. Si no hay una cotización válida, se informa al usuario y se conserva MXN disponible; no se inventa una tasa ni se cobra otra moneda silenciosamente.

La cotización firmada HMAC dura 15 minutos para iniciar el pago y contiene moneda, importe en unidades menores, precio base MXN, tasa, fecha y vencimiento. La firma está separada por propósito usando `APP_ENCRYPTION_KEY`. El servidor compara el precio base con el total real del pedido después de descuentos. El navegador no puede definir el importe de cobro. Se respetan las monedas sin decimales y las reglas especiales de ISK/UGX.

Cuando el cliente elige una moneda en nuestra web, se fija el importe de la sesión alojada y se desactiva Adaptive Pricing para esa sesión. Stripe debe cobrar exactamente la moneda y el total elegidos. El importe permanece fijo durante la vida de esa sesión de Stripe, aunque posteriormente venza el token usado para abrirla.

Este tipo de cambio es comercial de nuestra web: **no es una cotización de Stripe ni garantiza el neto recibido en MXN**. Se aplican las comisiones habituales de procesamiento y conversión de Stripe, y el negocio asume las diferencias de liquidación. No se aplica la conversión adicional de Adaptive Pricing a una selección explícita porque esa función está deshabilitada en la sesión. Los clientes antiguos/API que no manden `currencyQuote` conservan compatibilidad con el flujo anterior.

## Cambiar la moneda desde Stripe

El checkout alojado no admite añadir nuestro propio selector ni cambiar libremente la moneda de una sesión ya creada. El mensaje de pago indica que, para elegir otra, debe usarse **Volver**. La URL de cancelación abre los pedidos del usuario, donde puede cambiar moneda, revisar el nuevo total y pulsar **Completar pago**.

Antes de reemplazar una sesión abierta se la expira en Stripe. La operación se serializa bloqueando la fila del pedido, de modo que solicitudes simultáneas no abran dos sesiones cobrables. Si el pago ya se completó, se confirma; si está procesándose o no puede expirarse, no se crea otro. Se mantiene la clave de idempotencia de creación, ahora ligada también a moneda e importe.

El backend mantiene autenticación, propiedad del pedido, firma de webhooks y comprobación del importe contra el pago persistido. Las claves privadas permanecen cifradas. El webhook existente es `/api/v1/payments/webhooks/stripe`, con eventos `checkout.session.completed` y `checkout.session.async_payment_succeeded`. Las cotizaciones públicas tienen validación de DTO, límite de solicitudes y respuesta sin caché; la detección de país también usa respuesta privada sin caché.

El pedido y los saldos de planes se conservan en MXN. `Payment.checkoutAmount`, `checkoutCurrency`, `checkoutRate` y `checkoutRateAt` guardan la cotización del cobro activo; `presentmentAmount`/`presentmentCurrency` guardan el pago confirmado. La página de éxito muestra el cobro real. Las transferencias siguen en MXN; las parcialidades futuras se cotizan al pagarse, sin cargos automáticos.

## Despliegue y verificación

Instalar dependencias del backend (`npm ci --prefix backend`), generar Prisma y aplicar las migraciones `20261023010000_stripe_presentment` y `20261023020000_checkout_currency` antes de arrancar el backend nuevo. Ambas ya se aplicaron en MySQL local. En otros entornos usar `npm run db:generate` y `npm run db:deploy`; no ejecutar seed ni reset.

Mantener `APP_ENCRYPTION_KEY` y las claves Stripe de la cuenta. Detrás de Nginx, configurar `TRUSTED_PROXY_CIDRS` solamente con los proxies reales para que Express resuelva la IP del visitante; no confiar en encabezados enviados directamente por cualquier cliente. La base GeoIP debe actualizarse con las actualizaciones de la dependencia. Geolocalización basada en [GeoLite2 de MaxMind](https://www.maxmind.com).

Pruebas: preferencia manual y país, cotizaciones alteradas/vencidas, proveedor caído, monedas sin decimales, cupones, cancelación y cambio de moneda, sesión anterior pagada/procesando, plan en parcialidades y transferencia MXN. `node backend/test/currency-smoke.cjs` debe ejecutarse desde `backend` como `node test/currency-smoke.cjs`: consulta la cuenta real y las tasas sin imprimir claves. Con `CURRENCY_TEST_SESSION=1` también crea y expira inmediatamente una sesión exclusivamente TEST, sin cobrar. Esta comprobación se realizó con USD. Con `CURRENCY_HTTP_SMOKE=1` comprueba los endpoints del backend que esté corriendo en el puerto 4000.

Referencias: [monedas de la cuenta Stripe](https://docs.stripe.com/api/country_specs/object), [ExchangeRate-API público](https://www.exchangerate-api.com/docs/free), [Adaptive Pricing](https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing?payment-ui=stripe-hosted).
