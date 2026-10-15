// Test the Nest production build, including Swagger's compile-time plugin.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
const { AppModule } = require('../dist/src/app.module');
const { ListMasterclassDto } = require('../dist/src/masterclass/masterclass.dto');
const { ListUsersDto } = require('../dist/src/users/dto/list-users.dto');
const { ListOrdersDto } = require('../dist/src/sales/dto/list-orders.dto');
const { ListPaymentPlansDto } = require('../dist/src/paid-course/paid-course.dto');

async function run() {
  const app = await NestFactory.create(AppModule, { logger: false });
  // No listen/init: this test neither connects to MySQL nor starts scheduled mail.
  try {
    app.setGlobalPrefix('api/v1');
    const spec = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const { operations, callOperation } = await import('../../mcp/academy.mjs');
    const catalog = operations(spec, 'http://localhost:4000/api/v1');
    const routes = [
      ['/admin/masterclass/registrations', ListMasterclassDto, 25],
      ['/admin/users', ListUsersDto, 20],
      ['/admin/orders/search', ListOrdersDto, 25],
      ['/admin/paid-course/plans', ListPaymentPlansDto, 25],
    ];
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    for (const [path, dto, defaultLimit] of routes) {
      const api = spec.paths['/api/v1' + path].get;
      const tool = [...catalog.values()].find((item) => item.method === 'GET' && item.path === path);
      for (const name of ['page', 'limit']) {
        const parameter = api.parameters.find((item) => item.name === name);
        assert.equal(parameter.schema.type, 'integer', path + ' ' + name);
        assert.equal(parameter.schema.allOf, undefined);
        assert.equal(parameter.required, false);
        assert.equal(parameter.schema.minimum, 1);
        assert.equal(parameter.schema.default, name === 'page' ? 1 : defaultLimit);
        assert.equal(tool.tool.inputSchema.properties.query.properties[name].type, 'integer');
      }
      assert.equal(api.parameters.find((item) => item.name === 'limit').schema.maximum, 100);
      const meta = { type: 'query', metatype: dto };
      const value = await pipe.transform({ page: '2', limit: '10' }, meta);
      assert.equal(value.page, 2); assert.equal(value.limit, 10);
      const defaults = await pipe.transform({}, meta);
      assert.equal(defaults.page, 1); assert.equal(defaults.limit, defaultLimit);
      await assert.rejects(pipe.transform({ page: {} }, meta), /Bad Request/);
      await assert.rejects(pipe.transform({ limit: '101' }, meta), /Bad Request/);
      await assert.rejects(pipe.transform({ page: '0' }, meta), /Bad Request/);
      // Exercise MCP serialization from the generated tool into the real Nest DTO pipe.
      const originalFetch = global.fetch;
      try {
        global.fetch = async (url) => {
          const parsed = await pipe.transform(Object.fromEntries(url.searchParams), meta);
          assert.equal(parsed.page, 2); assert.equal(parsed.limit, 10);
          return new Response('{"items":[]}', { status: 200 });
        };
        const response = await callOperation('http://localhost:4000/api/v1', 'test', tool, { query: { page: 2, limit: 10 } });
        assert.equal(response.isError, undefined);
      } finally { global.fetch = originalFetch; }
    }
    console.log('Compiled OpenAPI → MCP → Nest pagination verified for all four list DTOs. No database changes or emails.');
  } finally { await app.close(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
