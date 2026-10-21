import { BadRequestException } from '@nestjs/common';
import type { BlogBlockDto } from './blog.dto';
export function blogSlug(value: string) {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 170)
    .replace(/-$/, '');
  if (!slug || ['categoria', 'categorias', 'sitemap', 'feed'].includes(slug))
    throw new BadRequestException('Elige un slug válido para la URL');
  return slug;
}
export function blogUrl(value: string, local = true) {
  const url = value.trim();
  if (
    url.includes('\\') ||
    Array.from(url).some((character) => character.charCodeAt(0) < 32)
  )
    throw new BadRequestException('URL no permitida');
  if (local && /^\/(?!\/)/.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (
      ['https:', 'http:'].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
    )
      return parsed.href;
  } catch {
    /* report a consistent validation error */
  }
  throw new BadRequestException('Usa una URL HTTP/HTTPS o una ruta del sitio');
}
export function blogVideo(value: string) {
  const url = new URL(blogUrl(value, false));
  if (url.protocol !== 'https:')
    throw new BadRequestException('El video debe usar HTTPS');
  const host = url.hostname.replace(/^www\./, '');
  if (['youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) {
    const id =
      host === 'youtu.be'
        ? url.pathname.slice(1)
        : url.searchParams.get('v') ||
          url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1];
    if (id && /^[\w-]{11}$/.test(id))
      return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
    const id = url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1];
    if (id) return `https://player.vimeo.com/video/${id}`;
  }
  throw new BadRequestException('Usa un enlace válido de YouTube o Vimeo');
}
export function cleanBlogBlocks(blocks: BlogBlockDto[], publishing: boolean) {
  if (Buffer.byteLength(JSON.stringify(blocks), 'utf8') > 75000)
    throw new BadRequestException(
      'El contenido supera el máximo de 75 KB. Divide el artículo en varias publicaciones.',
    );
  if (new Set(blocks.map((b) => b.id)).size !== blocks.length)
    throw new BadRequestException('Cada bloque debe tener un ID único');
  const clean = blocks.map((block) => {
    const base = { id: block.id, type: block.type };
    const text = block.text?.trim() || '';
    if (block.type === 'divider') return base;
    if (
      block.type === 'image' ||
      block.type === 'video' ||
      block.type === 'button'
    ) {
      if (!block.url?.trim()) {
        if (publishing)
          throw new BadRequestException(
            'Completa la URL de imágenes, videos y botones',
          );
        return {
          ...base,
          url: '',
          text,
          alt: block.alt || '',
          caption: block.caption || '',
        };
      }
      const url =
        block.type === 'video' ? blogVideo(block.url) : blogUrl(block.url);
      if (publishing && block.type === 'button' && !text)
        throw new BadRequestException('El botón necesita un texto');
      return {
        ...base,
        url,
        text,
        alt: block.alt?.trim() || '',
        caption: block.caption?.trim() || '',
      };
    }
    if (block.type === 'list') {
      const items = (block.items || [])
        .map((item) => item.trim())
        .filter(Boolean);
      if (publishing && !items.length)
        throw new BadRequestException('Completa o elimina las listas vacías');
      return { ...base, items, ordered: !!block.ordered };
    }
    if (publishing && !text)
      throw new BadRequestException(
        'Completa o elimina los bloques de texto vacíos',
      );
    return {
      ...base,
      text,
      ...(block.type === 'heading' ? { level: block.level || 2 } : {}),
      ...(block.type === 'quote'
        ? { attribution: block.attribution?.trim() || '' }
        : {}),
    };
  });
  if (publishing && !clean.some((block) => block.type !== 'divider'))
    throw new BadRequestException('Agrega contenido antes de publicar');
  return clean;
}
