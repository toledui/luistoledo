import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('MCP SDK negotiates stdio, discovers operations and calls the REST API', async () => {
  const key = `lta_${'b'.repeat(64)}`;
  const http = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/docs-json') {
      res.end(JSON.stringify({ paths: { '/api/v1/admin/masterclass/registrations': { get: { operationId: 'masterclass_list', parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', maximum: 100 } }] } } } }));
      return;
    }
    if (req.headers.authorization !== `Bearer ${key}`) { res.writeHead(401); res.end('{}'); return; }
    assert.equal(req.url, '/api/v1/admin/masterclass/registrations?limit=1');
    res.end(JSON.stringify({ items: [{ id: 'registration' }], total: 57 }));
  });
  await new Promise((resolve) => http.listen(0, '127.0.0.1', resolve));
  const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('./server.mjs', import.meta.url))], env: { ...process.env, ACADEMY_API_URL: `http://127.0.0.1:${http.address().port}/api/v1`, ACADEMY_API_KEY: key, ACADEMY_READ_ONLY: 'true' }, stderr: 'pipe' });
  const client = new Client({ name: 'academy-test', version: '1.0.0' });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.equal(tools.length, 1);
    assert.equal(tools[0].annotations.readOnlyHint, true);
    const result = await client.callTool({ name: tools[0].name, arguments: { query: { limit: 1 } } });
    assert.equal(JSON.parse(result.content[0].text).total, 57);
  } finally { await client.close(); await new Promise((resolve) => http.close(resolve)); }
});
