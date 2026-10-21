import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BlogBlockDto, BlogListDto, UpdateBlogPostDto } from './blog.dto';
import { blogSlug, blogUrl, blogVideo, cleanBlogBlocks } from './blog.helpers';
describe('Blog content validation', () => {
  it('creates stable Spanish slugs and rejects empty or reserved paths', () => {
    expect(blogSlug(' Inteligencia Artificial: Guía Práctica ')).toBe(
      'inteligencia-artificial-guia-practica',
    );
    expect(() => blogSlug('???')).toThrow(BadRequestException);
    expect(() => blogSlug('categoria')).toThrow(BadRequestException);
  });
  it('rejects script URLs and protocol-relative escapes while allowing site links', () => {
    expect(blogUrl('/cursos')).toBe('/cursos');
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,test',
      '//evil.example',
      '/\\evil.example',
      'https://user:password@example.com',
    ])
      expect(() => blogUrl(url)).toThrow(BadRequestException);
  });
  it('normalizes only supported video embeds with exact host validation', () => {
    expect(blogVideo('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
    expect(blogVideo('https://vimeo.com/123456')).toBe(
      'https://player.vimeo.com/video/123456',
    );
    expect(() =>
      blogVideo('https://youtube.com.evil.example/embed/dQw4w9WgXcQ'),
    ).toThrow(BadRequestException);
  });
  it('allows incomplete drafts and requires useful content before publishing', () => {
    expect(cleanBlogBlocks([], false)).toEqual([]);
    expect(() => cleanBlogBlocks([], true)).toThrow(BadRequestException);
    expect(() =>
      cleanBlogBlocks([{ id: 'a', type: 'paragraph', text: '' }], true),
    ).toThrow(BadRequestException);
    expect(() =>
      cleanBlogBlocks([{ id: 'a', type: 'list', items: [' ', ''] }], true),
    ).toThrow(BadRequestException);
    expect(() =>
      cleanBlogBlocks([{ id: 'a', type: 'image', url: '' }], true),
    ).toThrow(BadRequestException);
  });
  it('rejects duplicate block IDs and oversized documents', () => {
    expect(() =>
      cleanBlogBlocks(
        [
          { id: 'a', type: 'paragraph', text: 'one' },
          { id: 'a', type: 'paragraph', text: 'two' },
        ],
        false,
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      cleanBlogBlocks(
        [{ id: 'a', type: 'paragraph', text: 'a'.repeat(76000) }],
        false,
      ),
    ).toThrow(BadRequestException);
  });
  it('rejects unknown block types through the actual DTO validator', async () => {
    const dto = plainToInstance(UpdateBlogPostDto, {
      title: 'Post',
      slug: 'post',
      excerpt: 'Summary',
      authorName: 'Author',
      status: 'PUBLISHED',
      blocks: [{ id: 'a', type: 'script', text: '<script>alert(1)</script>' }],
    });
    expect(
      (await validate(dto)).some((error) => error.property === 'blocks'),
    ).toBe(true);
  });
  it('validates pagination as integers with bounded limits', async () => {
    const good = plainToInstance(BlogListDto, { page: '2', limit: '20' });
    expect(await validate(good)).toHaveLength(0);
    expect(good.page).toBe(2);
    expect(
      await validate(plainToInstance(BlogListDto, { page: 0, limit: 101 })),
    ).toHaveLength(2);
  });
  it('does not store unrecognized content fields', () => {
    const raw = {
      id: 'a',
      type: 'paragraph',
      text: '<script>plain text</script>',
      html: '<script>execute</script>',
    } as BlogBlockDto;
    expect(cleanBlogBlocks([raw], true)).toEqual([
      { id: 'a', type: 'paragraph', text: '<script>plain text</script>' },
    ]);
  });
});
