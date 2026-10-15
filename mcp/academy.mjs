import { createHash } from 'node:crypto';

export function resolveSchema(schema, document, seen = new Set()) {
  if (!schema || typeof schema !== 'object') return schema;
  if (schema.$ref) {
    if (!schema.$ref.startsWith('#/') || seen.has(schema.$ref)) return {};
    const target = schema.$ref.slice(2).split('/').reduce((value, key) => value?.[key.replace(/~1/g, '/').replace(/~0/g, '~')], document);
    return resolveSchema(target ?? {}, document, new Set([...seen, schema.$ref]));
  }
  if (Array.isArray(schema)) return schema.map((item) => resolveSchema(item, document, seen));
  return Object.fromEntries(Object.entries(schema).map(([key, value]) => [key, resolveSchema(value, document, seen)]));
}

export function normalizeParameterSchema(schema, document, parameter) {
  const resolved = resolveSchema(schema, document);
  // Compatibility with older Academy OpenAPI builds: numeric pagination defaults
  // were emitted as Object, sometimes inside allOf. Never reinterpret real objects
  // or infer integer semantics for unrelated numeric parameters.
  if (parameter.in !== 'query' || !['page', 'limit'].includes(parameter.name)) return resolved;
  const flatten = (part) => [part, ...(part.allOf ?? []).flatMap(flatten)];
  const parts = flatten(resolved);
  const objectKeys = ['additionalProperties', 'patternProperties', 'minProperties', 'maxProperties'];
  if (parts.some((part) => objectKeys.some((key) => key in part) || Object.keys(part.properties ?? {}).length || (part.required?.length ?? 0) || part.anyOf || part.oneOf || (part.type && part.type !== 'object'))) return resolved;
  if (!parts.some((part) => ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum'].some((key) => typeof part[key] === 'number'))) return resolved;
  const normalized = Object.assign({}, ...parts);
  delete normalized.allOf;
  delete normalized.properties;
  delete normalized.required;
  return { ...normalized, type: 'integer' };
}

export function operations(document, baseUrl, readOnly = false) {
  const prefix = new URL(baseUrl).pathname.replace(/\/$/, '');
  const result = new Map();
  for (const [fullPath, pathItem] of Object.entries(document.paths ?? {})) {
    const path = fullPath.startsWith(prefix + '/') ? fullPath.slice(prefix.length) : fullPath;
    if (!path.startsWith('/admin/') || path.startsWith('/admin/settings/api-keys') || /\/users\/[^/]+\/(roles|sessions)(\/|$)/.test(path)) continue;
    for (const [verb, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'patch', 'put', 'delete'].includes(verb) || (readOnly && verb !== 'get')) continue;
      const properties = {};
      const required = [];
      for (const location of ['path', 'query']) {
        const parameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])].map((p) => resolveSchema(p, document)).filter((p) => p.in === location);
        if (!parameters.length) continue;
        const requiredFields = parameters.filter((p) => p.required).map((p) => p.name);
        properties[location] = { type: 'object', properties: Object.fromEntries(parameters.map((p) => [p.name, { ...normalizeParameterSchema(p.schema ?? { type: 'string' }, document, p), ...(p.description ? { description: p.description } : {}) }])), additionalProperties: false, ...(requiredFields.length ? { required: requiredFields } : {}) };
        if (requiredFields.length) required.push(location);
      }
      const requestBody = resolveSchema(operation.requestBody, document);
      if (requestBody && !requestBody.content?.['application/json']) continue; // Binary uploads use REST.
      if (requestBody?.content?.['application/json']) {
        properties.body = resolveSchema(requestBody.content['application/json'].schema ?? { type: 'object' }, document);
        if (requestBody.required) required.push('body');
      }
      const suffix = createHash('sha256').update(`${verb} ${path}`).digest('hex').slice(0, 8);
      const name = `${(operation.operationId ?? `${verb}_${path}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 54)}_${suffix}`;
      result.set(name, {
        path, method: verb.toUpperCase(),
        tool: { name, description: `${verb.toUpperCase()} ${path}${operation.summary ? ` — ${operation.summary}` : ''}`, inputSchema: { type: 'object', properties, additionalProperties: false, ...(required.length ? { required } : {}) }, annotations: { readOnlyHint: verb === 'get', destructiveHint: ['delete', 'patch', 'put'].includes(verb), idempotentHint: verb === 'get', openWorldHint: false } },
      });
    }
  }
  return result;
}

export async function callOperation(baseUrl, apiKey, operation, args = {}) {
  let path = operation.path.replace(/\{([^}]+)\}/g, (_, name) => {
    const value = args.path?.[name];
    if (!['string', 'number'].includes(typeof value) || value === '' || value === '.' || value === '..') throw new Error(`Parámetro de ruta inválido: ${name}`);
    return encodeURIComponent(String(value));
  });
  if (!path.startsWith('/admin/') || path.includes('{')) throw new Error('Ruta inválida');
  const url = new URL(`${baseUrl.replace(/\/$/, '')}${path}`);
  for (const [key, value] of Object.entries(args.query ?? {})) {
    if (value === undefined || value === null) continue;
    if (!['string', 'number', 'boolean'].includes(typeof value)) throw new Error(`El parámetro de consulta ${key} debe ser un valor escalar, no un objeto`);
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { method: operation.method, redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', ...(args.body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(args.body === undefined ? {} : { body: JSON.stringify(args.body) }) });
  const text = await response.text();
  return { content: [{ type: 'text', text: text || JSON.stringify({ status: response.status }) }], ...(response.ok ? {} : { isError: true }) };
}
