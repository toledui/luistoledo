# Blog y mapa del sitio

## Dónde administrar

- `/admin/blog`: publicaciones, búsqueda, filtros y creación de borradores.
- `/admin/blog/categorias`: alta, edición y eliminación de categorías.
- `/admin/blog/:id`: constructor, vista previa, portada y opciones de publicación/SEO.
- `/blog`: blog público, búsqueda y paginación.
- `/blog/categoria/:slug`: archivo público por categoría.
- `/blog/:slug`: artículo con contenido renderizado en el servidor, URL canónica,
  Open Graph, Twitter Cards y datos estructurados `BlogPosting`.
- `/sitemap.xml`: URLs públicas vigentes de la web, cursos listados, blog y categorías con artículos.
- `/robots.txt`: referencia al sitemap y exclusión de rutas privadas y transaccionales.

## Instalación

Aplicar `npm run prisma:generate` y `npm run prisma:deploy` en `backend`, compilar
y reiniciar ambos servicios según `DEPLOY.md`. La migración agrega `blog.manage`
y lo concede al rol `SUPER_ADMIN` sin ejecutar el seed ni cambiar contraseñas.
Para otros roles, asignar ese permiso explícitamente. `media.manage` permite
usar el selector y subir imágenes desde el editor; sin ese permiso se pueden
utilizar URLs de imágenes. Las API keys admiten `blog.manage:read` y `blog.manage:write`.

En producción configurar `NEXT_PUBLIC_APP_URL` con la URL HTTPS real de la web
y `NEXT_PUBLIC_API_URL` con la API que puede alcanzar el servidor Next.js.
Las URLs canónicas, el sitemap y robots utilizan esa URL pública.
No se requiere ninguna cuenta externa para publicar artículos.

## Constructor

Los bloques disponibles son texto, encabezado H2/H3, imagen, cita, lista,
botón, video de YouTube/Vimeo y separador. Se pueden agregar, mover, duplicar
y eliminar. La vista previa utiliza el mismo renderer que el artículo público.
Los textos son texto plano con saltos de línea, no HTML ejecutable.
Las imágenes admiten texto alternativo y pie; los enlaces se validan y los
videos se convierten a embeds de proveedores permitidos.

Cada publicación puede tener categoría, portada, autor visible, resumen,
slug, título SEO y descripción SEO. El editor advierte sobre cambios sin guardar
al salir y bloquea la edición durante el guardado. Límite: 100 bloques y 75 KB
de contenido estructurado por publicación.

Las categorías con publicaciones asignadas no pueden eliminarse hasta reasignar
los artículos. Esto también incluye borradores y archivos. Se registran las
operaciones administrativas en la auditoría existente.

## Publicación y sitemap automático

- **Borrador**: visible solo para administradores con permiso.
- **Publicado**: visible públicamente cuando llega su fecha de publicación.
- **Archivado**: retirado del blog público y del sitemap, conservando el contenido.
- Una fecha futura programa la visibilidad. No requiere cron: tanto las páginas
  como el manifiesto del sitemap filtran por estado y fecha en cada consulta.

El sitemap se genera dinámicamente en cada solicitud y sus consultas a la API
usan `no-store`. Crear un borrador no lo agrega; publicar lo agrega en la siguiente
consulta; editar actualiza `lastmod`; archivar o eliminar lo retira. Las categorías
vacías no se incluyen. Las páginas privadas, URLs anteriores y cursos no listados
también quedan fuera. Si la API falla, la solicitud falla para que el rastreador
reintente en vez de recibir un sitemap parcial como si fuera correcto.

Si cambia el slug de un artículo que ya tuvo fecha de publicación, la URL anterior
responde con una redirección HTTP 308 a la vigente mientras el post siga publicado.
Se resuelve antes del renderizado progresivo mediante el proxy de Next.js.
Los slugs anteriores quedan
reservados y no se incluyen en el sitemap. Eliminar el artículo elimina sus alias.

Los buscadores deben volver a consultar el sitemap para descubrir cambios:
su actualización automática no implica indexación inmediata. Se puede registrar
`https://TU_DOMINIO/sitemap.xml` en Search Console. No se hace un envío externo
automático en nombre del administrador. Un único sitemap soporta 50 000 URLs;
el generador falla explícitamente si se supera ese límite para requerir su división.

## Validación

- `npm run test --prefix frontend`
- `npm run test --prefix backend -- --runInBand`
- `npm run test:blog:integration --prefix backend`
- Para la validación visual en Windows con Edge instalado: compilar backend y
  ejecutar `node test/blog.integration.cjs --browser` desde `backend`.

La prueba de integración usa una transacción que revierte categorías, posts,
usuarios y sesiones. Detiene los trabajos programados en su aplicación de prueba
y no envía correos ni eventos a proveedores. La opción de navegador inicia
servidores locales temporales, verifica constructor, artículo, vista móvil,
sitemap y redirecciones, y cierra los procesos que crea.
