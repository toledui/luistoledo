require('dotenv/config');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
const { Test } = require('@nestjs/testing');
const { ConfigService } = require('@nestjs/config');
const { JwtService } = require('@nestjs/jwt');
const { SchedulerRegistry } = require('@nestjs/schedule');
const { ValidationPipe } = require('@nestjs/common');
const cookieParser = require('cookie-parser');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { AppModule } = require('../dist/src/app.module');
const config = new ConfigService();
const prisma = new PrismaService(config);
const rollback = new Error('BLOG_TEST_ROLLBACK');
const browserMode = process.argv.includes('--browser');
let checks = 0;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32')
    await new Promise((resolve) => {
      const killer = spawn(
        'taskkill',
        ['/pid', String(child.pid), '/t', '/f'],
        { windowsHide: true, stdio: 'ignore' },
      );
      killer.once('close', resolve);
    });
  else child.kill('SIGTERM');
}
async function run() {
  try {
    await prisma.$transaction(
      async (tx) => {
        const client = new Proxy(tx, {
          get(target, key) {
            if (key === 'onModuleDestroy') return () => Promise.resolve();
            return key === '$transaction'
              ? (input) =>
                  typeof input === 'function' ? input(tx) : Promise.all(input)
              : target[key];
          },
        });
        const testing = await Test.createTestingModule({ imports: [AppModule] })
          .overrideProvider(PrismaService)
          .useValue(client)
          .setLogger({
            log() {},
            warn() {},
            error() {},
            debug() {},
            verbose() {},
          })
          .compile();
        const app = testing.createNestApplication({ logger: false });
        let nextProcess;
        let browser;
        try {
          app.setGlobalPrefix('api/v1');
          app.use(cookieParser());
          app.enableCors({ origin: true, credentials: true });
          app.useGlobalPipes(
            new ValidationPipe({
              transform: true,
              whitelist: true,
              forbidNonWhitelisted: true,
            }),
          );
          await app.init();
          // No mail, payment reminders or analytics deliveries may run in this fixture application.
          const scheduler = app.get(SchedulerRegistry);
          for (const name of scheduler.getIntervals())
            scheduler.deleteInterval(name);
          for (const name of scheduler.getTimeouts())
            scheduler.deleteTimeout(name);
          for (const name of scheduler.getCronJobs().keys())
            scheduler.deleteCronJob(name);
          await app.listen(0, '127.0.0.1');
          console.log(
            'Blog integration: local API and isolated transaction ready.',
          );
          const api = `${await app.getUrl()}/api/v1`;
          const suffix = randomUUID();
          // Keep branding from the real installation from pointing outside the isolated test origins.
          await tx.brandingSetting.updateMany({
            data: { primaryLogoUrl: null, darkLogoUrl: null },
          });
          const role = await tx.role.findUniqueOrThrow({
            where: { name: 'SUPER_ADMIN' },
          });
          const user = await tx.user.create({
            data: {
              firstName: 'Blog',
              lastName: 'Integration',
              email: `blog-${suffix}@example.invalid`,
              passwordHash: 'not-a-login-credential',
              status: 'ACTIVE',
              roles: { create: { roleId: role.id } },
            },
          });
          const auth = await tx.authSession.create({
            data: {
              userId: user.id,
              refreshTokenHash: randomUUID(),
              expiresAt: new Date(Date.now() + 3600000),
            },
          });
          const token = app.get(JwtService).sign(
            { sub: user.id, email: user.email, sessionId: auth.id },
            {
              secret: config.getOrThrow('JWT_ACCESS_SECRET'),
              expiresIn: '15m',
            },
          );
          const cookieName = config.get('COOKIE_ACCESS_NAME', 'lt_access');
          const request = async (
            method,
            route,
            body,
            expected = 200,
            authenticated = true,
          ) => {
            const response = await fetch(`${api}${route}`, {
              method,
              headers: {
                ...(body ? { 'Content-Type': 'application/json' } : {}),
                ...(authenticated ? { Cookie: `${cookieName}=${token}` } : {}),
              },
              ...(body ? { body: JSON.stringify(body) } : {}),
            });
            const value = await response.json();
            assert.equal(
              response.status,
              expected,
              `${method} ${route}: ${JSON.stringify(value).slice(0, 250)}`,
            );
            return value;
          };
          await request('GET', '/admin/blog/posts', null, 401, false);
          checks++;
          const category = await request(
            'POST',
            '/admin/blog/categories',
            {
              name: `Categoría ${suffix}`,
              slug: `category-${suffix}`,
              description:
                'Una categoría para verificar la publicación automática.',
            },
            201,
          );
          const post = await request(
            'POST',
            '/admin/blog/posts',
            { title: `Guía práctica ${suffix}` },
            201,
          );
          let payload = {
            title: 'Una guía para convertir ideas en resultados',
            slug: post.slug,
            excerpt:
              'Un artículo de prueba para validar el blog y la actualización del sitemap.',
            authorName: 'Luis Toledo',
            categoryId: category.id,
            status: 'DRAFT',
            blocks: [
              {
                id: 'heading',
                type: 'heading',
                level: 2,
                text: 'De la idea a la acción',
              },
              {
                id: 'paragraph',
                type: 'paragraph',
                text: 'Primero definimos el objetivo. Después construimos una solución que podamos medir.',
              },
            ],
            coverUrl: '',
            coverAlt: '',
            seoTitle: 'Guía práctica de implementación',
            seoDescription: 'Ideas y pasos para aplicar lo aprendido.',
          };
          await request('PATCH', `/admin/blog/posts/${post.id}`, payload);
          await request('GET', `/blog/posts/${post.slug}`, null, 404, false);
          assert.equal(
            (await request('GET', '/blog/sitemap', null, 200, false)).some(
              (item) => item.path === `/blog/${post.slug}`,
            ),
            false,
          );
          checks++;
          let frontend;
          if (browserMode) {
            const frontendDir = path.resolve(__dirname, '../../frontend');
            frontend = `http://127.0.0.1:${await freePort()}`;
            const nextBin = path.join(
              frontendDir,
              'node_modules/next/dist/bin/next',
            );
            nextProcess = spawn(
              process.execPath,
              [
                nextBin,
                'dev',
                '--hostname',
                '127.0.0.1',
                '--port',
                new URL(frontend).port,
              ],
              {
                cwd: frontendDir,
                windowsHide: true,
                env: {
                  ...process.env,
                  NEXT_DIST_DIR: '.next-dev/blog-test',
                  NEXT_PUBLIC_API_URL: api,
                  NEXT_PUBLIC_APP_URL: frontend,
                },
                stdio: ['ignore', 'pipe', 'pipe'],
              },
            );
            let logs = '';
            nextProcess.stdout.on('data', (chunk) => {
              logs = (logs + chunk).slice(-2000);
            });
            nextProcess.stderr.on('data', (chunk) => {
              logs = (logs + chunk).slice(-2000);
              process.stdout.write(chunk);
            });
            let started = false;
            for (let i = 0; i < 100; i++) {
              try {
                const response = await fetch(`${frontend}/robots.txt`, {
                  signal: AbortSignal.timeout(1500),
                });
                if (response.ok) {
                  started = true;
                  break;
                }
              } catch {}
              if (nextProcess.exitCode !== null) break;
              await delay(150);
            }
            assert.ok(started, `Frontend test server failed to start: ${logs}`);
            console.log('Blog integration: Next.js test server ready.');
            const xml = await (await fetch(`${frontend}/sitemap.xml`)).text();
            assert.equal(xml.includes(`/blog/${post.slug}`), false);
            checks++;
          }
          payload = {
            ...payload,
            status: 'PUBLISHED',
            publishedAt: new Date(Date.now() + 86400000).toISOString(),
          };
          await request('PATCH', `/admin/blog/posts/${post.id}`, payload);
          await request('GET', `/blog/posts/${post.slug}`, null, 404, false);
          assert.equal(
            (await request('GET', '/blog/sitemap', null, 200, false)).some(
              (item) => item.path === `/blog/${post.slug}`,
            ),
            false,
          );
          checks++;
          payload = {
            ...payload,
            publishedAt: new Date(Date.now() - 1000).toISOString(),
          };
          await request('PATCH', `/admin/blog/posts/${post.id}`, payload);
          const published = await request(
            'GET',
            `/blog/posts/${post.slug}`,
            null,
            200,
            false,
          );
          assert.equal(published.title, payload.title);
          assert.equal('createdById' in published, false);
          assert.equal('status' in published, false);
          checks++;
          const filtered = await request(
            'GET',
            `/blog/posts?category=${category.slug}&status=DRAFT`,
            null,
            200,
            false,
          );
          assert.equal(filtered.total, 1);
          checks++;
          assert.equal(
            (await request('GET', '/blog/sitemap', null, 200, false)).some(
              (item) => item.path === `/blog/${post.slug}`,
            ),
            true,
          );
          assert.equal(
            (
              await request(
                'GET',
                `/blog/categories/${category.slug}`,
                null,
                200,
                false,
              )
            ).id,
            category.id,
          );
          checks++;
          await request(
            'DELETE',
            `/admin/blog/categories/${category.id}`,
            null,
            409,
          );
          checks++;
          await request(
            'PATCH',
            `/admin/blog/posts/${post.id}`,
            {
              ...payload,
              blocks: [
                {
                  id: 'unsafe',
                  type: 'button',
                  text: 'Unsafe',
                  url: 'javascript:alert(1)',
                },
              ],
            },
            400,
          );
          checks++;
          if (browserMode) {
            const {
              chromium,
            } = require('../../frontend/node_modules/@playwright/test');
            browser = await chromium.launch({
              ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
              headless: true,
            });
            const context = await browser.newContext({
              viewport: { width: 1440, height: 1000 },
            });
            await context.addInitScript(() => {
              localStorage.setItem(
                'lta_consent_v1',
                JSON.stringify({
                  analytics: false,
                  advertising: false,
                  version: '2026-10-21.2',
                  at: Date.now(),
                }),
              );
            });
            await context.addCookies([
              {
                name: cookieName,
                value: token,
                url: frontend,
                httpOnly: true,
                sameSite: 'Lax',
              },
            ]);
            const page = await context.newPage();
            page.on('pageerror', (error) =>
              console.log('Browser page error:', error.message),
            );
            page.on('dialog', (dialog) => dialog.accept());
            page.setDefaultTimeout(45000);
            const output = path.resolve(
              __dirname,
              '../../frontend/node_modules/.cache/blog-test-screens',
            );
            fs.mkdirSync(output, { recursive: true });
            await page.goto(`${frontend}/admin/blog/${post.id}`);
            await page
              .getByRole('heading', { name: 'Constructor de artículos' })
              .waitFor();
            await page.screenshot({
              path: path.join(output, 'editor-before-edit.png'),
              fullPage: true,
            });
            await page
              .getByLabel('Texto del párrafo', { exact: true })
              .fill(
                'Contenido editado y verificado desde el constructor visual.',
              );
            await page
              .getByRole('button', { name: 'Lista', exact: true })
              .click();
            await page
              .getByLabel('Elementos de la lista')
              .fill(
                'Define el objetivo\nConstruye la solución\nMide el resultado',
              );
            await page
              .getByRole('button', {
                name: 'Mover bloque 3 arriba',
                exact: true,
              })
              .click();
            await page
              .getByRole('button', { name: 'Vista previa', exact: true })
              .click();
            await page
              .getByRole('region', { name: 'Vista previa del artículo' })
              .getByText('Mide el resultado')
              .waitFor();
            await page.screenshot({
              path: path.join(output, 'editor-preview.png'),
              fullPage: true,
            });
            await page
              .getByRole('button', { name: 'Guardar y publicar', exact: true })
              .click();
            await page
              .getByRole('status')
              .filter({ hasText: 'Publicación guardada.' })
              .waitFor();
            const saved = await request('GET', `/admin/blog/posts/${post.id}`);
            assert.equal(saved.status, 'PUBLISHED');
            assert.ok(new Date(saved.publishedAt).getTime() <= Date.now());
            assert.deepEqual(
              saved.blocks.map((block) => block.type),
              ['heading', 'list', 'paragraph'],
            );
            payload = { ...payload, blocks: saved.blocks };
            checks++;
            const articleResponse = await page.goto(
              `${frontend}/blog/${post.slug}`,
            );
            console.log(
              'Blog integration: public article HTTP status',
              articleResponse?.status(),
            );
            await page.waitForURL(`${frontend}/blog/${post.slug}`);
            await page.screenshot({
              path: path.join(output, 'public-attempt.png'),
              fullPage: true,
            });
            await page
              .getByRole('heading', { name: payload.title, exact: true })
              .waitFor();
            await page
              .locator('script[type="application/ld+json"]')
              .first()
              .waitFor({ state: 'attached' });
            assert.equal(
              await page.locator('link[rel="canonical"]').getAttribute('href'),
              `${frontend}/blog/${post.slug}`,
            );
            checks++;
            await page.screenshot({
              path: path.join(output, 'public-post.png'),
              fullPage: true,
            });
            await page.setViewportSize({ width: 390, height: 844 });
            await page.screenshot({
              path: path.join(output, 'public-post-mobile.png'),
              fullPage: true,
            });
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth,
              ),
              false,
            );
            checks++;
            const sitemapResponse = await fetch(`${frontend}/sitemap.xml`);
            assert.equal(sitemapResponse.status, 200);
            const sitemap = await sitemapResponse.text();
            assert.ok(sitemap.includes(`/blog/${post.slug}`));
            assert.ok(!sitemap.includes('/admin/'));
            checks++;
            assert.ok(
              (await (await fetch(`${frontend}/robots.txt`)).text()).includes(
                `${frontend}/sitemap.xml`,
              ),
            );
            checks++;
          }
          const oldSlug = payload.slug;
          payload = { ...payload, slug: `${payload.slug}-nuevo` };
          await request('PATCH', `/admin/blog/posts/${post.id}`, payload);
          assert.equal(
            (await request('GET', `/blog/posts/${oldSlug}`, null, 200, false))
              .redirectTo,
            `/blog/${payload.slug}`,
          );
          const manifest = await request(
            'GET',
            '/blog/sitemap',
            null,
            200,
            false,
          );
          assert.ok(
            manifest.some((item) => item.path === `/blog/${payload.slug}`),
          );
          assert.ok(!manifest.some((item) => item.path === `/blog/${oldSlug}`));
          checks++;
          if (frontend) {
            const response = await fetch(`${frontend}/blog/${oldSlug}`, {
              redirect: 'manual',
            });
            assert.equal(response.status, 308);
            checks++;
          }
          payload = { ...payload, status: 'ARCHIVED' };
          await request('PATCH', `/admin/blog/posts/${post.id}`, payload);
          await request('GET', `/blog/posts/${payload.slug}`, null, 404, false);
          assert.ok(
            !(await request('GET', '/blog/sitemap', null, 200, false)).some(
              (item) => item.path === `/blog/${payload.slug}`,
            ),
          );
          checks++;
          if (frontend) {
            const xml = await (await fetch(`${frontend}/sitemap.xml`)).text();
            assert.ok(!xml.includes(`/blog/${payload.slug}`));
            checks++;
          }
          await request('DELETE', `/admin/blog/posts/${post.id}`);
          assert.equal(
            await tx.blogPostSlug.count({ where: { postId: post.id } }),
            0,
          );
          await request('DELETE', `/admin/blog/categories/${category.id}`);
          checks++;
        } finally {
          if (browser) await browser.close();
          await stopChild(nextProcess);
          const tsconfig = path.resolve(
            __dirname,
            '../../frontend/tsconfig.json',
          );
          const source = JSON.parse(fs.readFileSync(tsconfig, 'utf8'));
          const filtered = source.include.filter(
            (value) => !value.startsWith('.next-dev/blog-test/'),
          );
          if (filtered.length !== source.include.length)
            fs.writeFileSync(
              tsconfig,
              JSON.stringify({ ...source, include: filtered }, null, 2) + '\n',
            );
          await app.close();
        }
        throw rollback;
      },
      { timeout: browserMode ? 180000 : 30000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log(
    `${checks} blog integration checks passed${browserMode ? ' including the real admin builder, responsive public article and live sitemap.xml' : ''}; all fixture data rolled back. No mail or provider events sent.`,
  );
}
run()
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
