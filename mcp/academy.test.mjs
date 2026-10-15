import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { operations, callOperation, resolveSchema } from './academy.mjs';
const document = { components: { schemas: { Course: { type: 'object', required: ['title'], properties: { title: { type: 'string' } } } } }, paths: {
  '/api/v1/admin/courses/{id}': { get: { operationId: 'getCourse', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }] }, patch: { operationId: 'editCourse', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Course' } } } } } },
  '/api/v1/admin/settings/api-keys': { post: {} }, '/api/v1/admin/users/{id}/roles': { patch: {} },
  '/api/v1/auth/me': { get: {} }, '/api/v1/admin/media/upload': { post: { requestBody: { content: { 'multipart/form-data': {} } } } },
} };
test('discovers schemas and excludes credential management, sessions, non-admin and binary routes', () => {
  const catalog = operations(document, 'http://localhost:4000/api/v1');
  assert.equal(catalog.size, 2);
  const read = [...catalog.values()].find((operation) => operation.method === 'GET');
  assert.deepEqual(read.tool.inputSchema.required, ['path']);
  assert.equal(read.tool.annotations.readOnlyHint, true);
  const write = [...catalog.values()].find((operation) => operation.method === 'PATCH');
  assert.deepEqual(write.tool.inputSchema.properties.body.required, ['title']);
  assert.equal(operations(document, 'http://localhost:4000/api/v1', true).size, 1);
  assert.deepEqual(resolveSchema({ $ref: '#/components/schemas/Missing' }, document), {});
});
test('sends bearer auth, encoded IDs and bodies, propagates API errors, and never follows redirects', async () => {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push({ url: req.url, authorization: req.headers.authorization, method: req.method });
    if (req.url.includes('redirect')) { res.writeHead(302, { Location: '/leak' }); res.end(); return; }
    res.writeHead(req.url.includes('forbidden') ? 403 : 200, { 'Content-Type': 'application/json' }); res.end('{"total":42}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    const operation = { method: 'GET', path: '/admin/courses/{id}' };
    const result = await callOperation(base, 'secret', operation, { path: { id: 'course one' }, query: { page: 2 } });
    assert.deepEqual(JSON.parse(result.content[0].text), { total: 42 });
    assert.equal(requests[0].url, '/api/v1/admin/courses/course%20one?page=2');
    assert.equal(requests[0].authorization, 'Bearer secret');
    assert.equal((await callOperation(base, 'secret', operation, { path: { id: 'forbidden' } })).isError, true);
    await assert.rejects(callOperation(base, 'secret', operation, { path: { id: 'redirect' } }));
    assert.equal(requests.some((request) => request.url === '/leak'), false);
    await assert.rejects(callOperation(base, 'secret', operation, { path: { id: '..' } }));
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
