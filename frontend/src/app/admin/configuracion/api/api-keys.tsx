"use client";
import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import styles from "./api-keys.module.css";

type ApiKey = { id: string; name: string; prefix: string; scopes: string[]; expiresAt: string | null; revokedAt: string | null; lastUsedAt: string | null; createdAt: string };
const areas = [
  ["masterclass", "Masterclass"], ["courses.manage", "Cursos e inscripciones"],
  ["users.manage", "Usuarios"], ["orders.manage", "Pedidos y cupones"],
  ["media.manage", "Multimedia"], ["settings.manage", "Configuración y comunicaciones"],
];
const initialScopes = ["masterclass:read", "courses.manage:read", "orders.manage:read"];
export function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Hermes");
  const [expiresAt, setExpiresAt] = useState("");
  const [scopes, setScopes] = useState(initialScopes);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { apiFetch<ApiKey[]>("/admin/settings/api-keys").then(setKeys).catch((e: Error) => setMessage(e.message)).finally(() => setLoading(false)); }, []);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(""); setToken("");
    try {
      const result = await apiFetch<ApiKey & { token: string }>("/admin/settings/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, scopes, ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}) }) });
      setToken(result.token);
      const { token: _secret, ...key } = result;
      void _secret;
      setKeys((previous) => [key, ...previous]);
    } catch (e) { setMessage(e instanceof Error ? e.message : "No fue posible crear la clave"); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setMessage("");
    try { await apiFetch(`/admin/settings/api-keys/${id}/revoke`, { method: "POST" }); setKeys((previous) => previous.map((key) => key.id === id ? { ...key, revokedAt: new Date().toISOString() } : key)); setToken(""); }
    catch (e) { setMessage(e instanceof Error ? e.message : "No fue posible revocar"); }
    finally { setBusy(false); }
  }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  return <main className={styles.page}>
    <header><h1>API y agentes</h1><p>Conecta Hermes o cualquier integración con claves independientes y permisos por área.</p></header>
    <form onSubmit={(event) => void create(event)} className={styles.card}>
      <h2>Crear API key</h2><div className={styles.fields}><label>Nombre<input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></label><label>Expira el (opcional)<input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></label></div>
      <fieldset><legend>Permisos</legend><p>Lectura permite consultar. Escritura permite crear, modificar y eliminar según el área.</p>
        {areas.map(([area, label]) => <div key={area} className={styles.scope}><strong>{label}</strong>{["read", "write"].map((mode) => { const scope = `${area}:${mode}`; return <label key={mode}><input type="checkbox" checked={scopes.includes(scope)} onChange={(e) => setScopes((previous) => e.target.checked ? [...previous, scope] : previous.filter((value) => value !== scope))} />{mode === "read" ? "Lectura" : "Escritura"}</label>; })}</div>)}
      </fieldset><button disabled={busy || loading || !scopes.length}>Crear clave</button>
    </form>
    {token && <section className={styles.secret}><h2>Guarda tu clave ahora</h2><p>Solo se muestra una vez. Al cerrar esta página no podrás recuperarla.</p><code>{token}</code><div><button type="button" onClick={() => void navigator.clipboard.writeText(token).then(() => setMessage("Clave copiada")).catch(() => setMessage("Selecciona y copia la clave manualmente"))}>Copiar clave</button><button type="button" onClick={() => setToken("")}>Ocultar</button></div></section>}
    {message && <p role="status">{message}</p>}
    <section className={styles.card}><h2>Claves creadas por ti</h2>{loading ? <p>Cargando…</p> : !keys.length ? <p>Aún no hay claves.</p> : keys.map((key) => { const expired = !!key.expiresAt && new Date(key.expiresAt) <= new Date(); return <article key={key.id} className={styles.key}><div><strong>{key.name}</strong> <code>{key.prefix}…</code><p>{key.revokedAt ? "Revocada" : expired ? "Expirada" : "Activa"} · Último uso: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString("es-MX") : "Sin uso"}</p><small>{key.scopes.join(", ")}</small><p>Expira: {key.expiresAt ? new Date(key.expiresAt).toLocaleString("es-MX") : "Sin expiración"}</p></div>{!key.revokedAt && <button type="button" disabled={busy} onClick={() => void revoke(key.id)}>Revocar</button>}</article>; })}</section>
    <section className={styles.card}><h2>Conectar el agente</h2><p>URL base de la API: <code>{baseUrl}</code></p><p>Envía la clave en <code>Authorization: Bearer TU_API_KEY</code>. La documentación interactiva está en <code>/api/docs</code> del backend.</p><pre>{`GET ${baseUrl}/admin/masterclass/registrations?limit=1\nAuthorization: Bearer TU_API_KEY`}</pre><p>El campo <code>total</code> indica los inscritos a la masterclass. Para Hermes usa el servidor incluido en <code>mcp/server.mjs</code> y la guía <code>mcp/README.md</code> del proyecto.</p></section>
  </main>;
}
