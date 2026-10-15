import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { operations, callOperation } from './academy.mjs';

const baseUrl = (process.env.ACADEMY_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');
const apiKey = process.env.ACADEMY_API_KEY;
const base = new URL(baseUrl);
if (!apiKey || !/^lta_[a-f0-9]{64}$/.test(apiKey)) throw new Error('Configura ACADEMY_API_KEY con la clave de Configuración → API y agentes');
if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))) throw new Error('Usa HTTPS para la API remota');
if (base.username || base.password || base.search || base.hash) throw new Error('ACADEMY_API_URL debe contener solo la URL base');
const schemaUrl = process.env.ACADEMY_OPENAPI_URL ?? new URL('/api/docs-json', baseUrl).href;
const response = await fetch(schemaUrl, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`No se pudo obtener OpenAPI: HTTP ${response.status}`);
const catalog = operations(await response.json(), baseUrl, process.env.ACADEMY_READ_ONLY === 'true');
const server = new Server({ name: 'luistoledo-academy', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: [...catalog.values()].map(({ tool }) => tool) }));
server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
  const operation = catalog.get(params.name);
  if (!operation) return { isError: true, content: [{ type: 'text', text: 'Herramienta desconocida' }] };
  try { return await callOperation(baseUrl, apiKey, operation, params.arguments); }
  catch { return { isError: true, content: [{ type: 'text', text: 'No se pudo completar la solicitud. Si era una escritura, consulta el estado antes de reintentar.' }] }; }
});
await server.connect(new StdioServerTransport());
