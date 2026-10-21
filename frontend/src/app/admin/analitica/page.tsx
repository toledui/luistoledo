"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useSessionUser } from "@/components/admin/admin-shell";
import styles from "./analytics.module.css";
type Summary = {
  visitors: number;
  sessions: number;
  active: number;
  revenue: number;
  purchases: number;
  conversions: { source: string; name: string; count: number; value: number }[];
  updatedAt: string;
  events: { name: string; _count: number }[];
  sources: { source: string; medium: string; _count: number }[];
  pages: { path: string; _count: number }[];
  daily: { day: string; views: number }[];
  deliveries: {
    provider: string;
    status: string;
    lastError: string | null;
    _count: number;
  }[];
};
type Visits = {
  total: number;
  page: number;
  items: {
    id: string;
    createdAt: string;
    entryPath: string;
    source: string;
    medium: string;
    campaign?: string;
    term?: string;
    referrer?: string;
    firstSource: string;
    lastNonDirectSource: string;
    ip?: string;
    userId?: string;
  }[];
};
type GoogleReport = {
  error?: string;
  rows?: {
    dimensionValues: { value: string }[];
    metricValues: { value: string }[];
  }[];
};
type Reports = {
  configured: boolean;
  error?: string;
  message?: string;
  updatedAt?: string;
  ga4?: GoogleReport | null;
  searchConsole?: {
    error?: string;
    rows?: {
      keys: string[];
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }[];
  } | null;
};
const money = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
export default function AnalyticsPage() {
  const user = useSessionUser();
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary>();
  const [visits, setVisits] = useState<Visits>();
  const [reports, setReports] = useState<Reports>();
  const [tab, setTab] = useState("overview");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "overview")
        setSummary(
          await apiFetch<Summary>(`/admin/analytics/summary?days=${days}`),
        );
      if (tab === "visits")
        setVisits(
          await apiFetch<Visits>(
            `/admin/analytics/visits?days=${days}&page=${page}`,
          ),
        );
      if (tab === "google")
        setReports(
          await apiFetch<Reports>(`/admin/analytics/reports?days=${days}`),
        );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible consultar la analítica",
      );
    } finally {
      setLoading(false);
    }
  }, [tab, days, page]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const count = (name: string) =>
    summary?.events.find((e) => e.name === name)?._count || 0;
  const funnel = [
    ["Visitas a cursos", count("view_item")],
    ["Añadidos al carrito", count("add_to_cart")],
    ["Inicios de checkout", count("begin_checkout")],
    ["Pagos confirmados", summary?.purchases || 0],
  ] as const;
  return (
    <main className={styles.page}>
      <header>
        <div>
          <span className={styles.eyebrow}>
            Luis Toledo Academy · Analítica
          </span>
          <h1>Conoce qué trae resultados.</h1>
          <p>
            Tráfico, registros y pagos con su procedencia y fuente de datos.
          </p>
        </div>
        <Link href="/admin/configuracion/analitica">
          Configurar integraciones →
        </Link>
      </header>
      <div className={styles.toolbar}>
        <nav aria-label="Reportes">
          <button
            aria-pressed={tab === "overview"}
            onClick={() => setTab("overview")}
          >
            Resumen propio
          </button>
          <button
            aria-pressed={tab === "google"}
            onClick={() => setTab("google")}
          >
            Google y SEO
          </button>
          {user?.permissions.includes("analytics.ip.read") && (
            <button
              aria-pressed={tab === "visits"}
              onClick={() => setTab("visits")}
            >
              Visitas e IP
            </button>
          )}
        </nav>
        <label>
          Período{" "}
          <select
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setPage(1);
            }}
          >
            {[1, 7, 30, 90, 365].map((n) => (
              <option key={n} value={n}>
                Últimos {n} días
              </option>
            ))}
          </select>
        </label>
        <button disabled={loading} onClick={() => void load()}>
          {loading ? "Consultando…" : "Actualizar"}
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading && <p role="status">Cargando datos…</p>}
      {tab === "overview" && summary && (
        <>
          <div className={styles.metrics}>
            {[
              ["Visitantes estimados", summary.visitors],
              ["Sesiones", summary.sessions],
              ["Activos · últimos 5 min", summary.active],
              ["Leads confirmados", count("generate_lead")],
              ["Pagos confirmados", summary.purchases],
              ["Importe cobrado atribuido", money(summary.revenue)],
            ].map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <p className={styles.note}>
            Fuente: registro propio con consentimiento de analítica. Los
            visitantes se estiman por navegador. Los pagos incluyen abonos por
            el importe cobrado en MXN. No representan todas las ventas de la
            academia.
          </p>
          <section className={styles.panel}>
            <h2>
              Páginas vistas por día <small>UTC</small>
            </h2>
            {summary.daily.length ? (
              <div className={styles.chart} aria-label="Páginas vistas por día">
                {summary.daily.map((d) => (
                  <div key={d.day} title={`${d.day}: ${d.views} vistas`}>
                    <span>{d.views}</span>
                    <i
                      style={{
                        height: `${Math.max(3, (d.views / Math.max(...summary.daily.map((v) => v.views))) * 130)}px`,
                      }}
                    />
                    <small>{d.day.slice(5)}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p>
                Las visitas aparecerán cuando los visitantes acepten la
                medición.
              </p>
            )}
          </section>
          <div className={styles.columns}>
            <section className={styles.panel}>
              <h2>De dónde vienen</h2>
              <div className={styles.table}>
                <table>
                  <thead>
                    <tr>
                      <th>Fuente</th>
                      <th>Medio</th>
                      <th>Sesiones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.sources.map((s) => (
                      <tr key={`${s.source}.${s.medium}`}>
                        <td>{s.source}</td>
                        <td>{s.medium}</td>
                        <td>{s._count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!summary.sources.length && <p>Sin procedencias registradas.</p>}
            </section>
            <section className={styles.panel}>
              <h2>Actividad del embudo</h2>
              {funnel.map(([label, value]) => (
                <div className={styles.funnel} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <progress
                    value={value}
                    max={Math.max(1, ...funnel.map(([, n]) => n))}
                  />
                </div>
              ))}
              <p className={styles.note}>
                Conteos de eventos; una persona puede repetir acciones. El
                checkout del curso de IA permite compra directa.
              </p>
            </section>
          </div>
          <div className={styles.columns}>
            <section className={styles.panel}>
              <h2>Páginas más visitadas</h2>
              {summary.pages.map((p) => (
                <div className={styles.row} key={p.path}>
                  <span>{p.path}</span>
                  <strong>{p._count}</strong>
                </div>
              ))}
              {!summary.pages.length && <p>Sin páginas registradas.</p>}
            </section>
            <section className={styles.panel}>
              <h2>Eventos registrados</h2>
              {summary.events.map((e) => (
                <div className={styles.row} key={e.name}>
                  <code>{e.name}</code>
                  <strong>{e._count}</strong>
                </div>
              ))}
            </section>
          </div>
          <section className={styles.panel}>
            <h2>Resultados por procedencia</h2>
            <p className={styles.note}>
              Conversiones atribuidas a la última fuente no directa conocida en
              este navegador.
            </p>
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    <th>Procedencia</th>
                    <th>Conversión</th>
                    <th>Cantidad</th>
                    <th>Importe cobrado</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.conversions.map((row) => (
                    <tr key={`${row.source}.${row.name}`}>
                      <td>{row.source}</td>
                      <td>{row.name}</td>
                      <td>{row.count}</td>
                      <td>
                        {row.name === "purchase" ? money(row.value) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!summary.conversions.length && (
              <p>Sin conversiones atribuidas en este período.</p>
            )}
          </section>
          <section className={styles.panel}>
            <h2>Estado de envíos desde el servidor</h2>
            <p className={styles.note}>
              SENT indica aceptación HTTP. Google puede descartar un evento con
              parámetros inválidos; valida también en DebugView. NOT_CONFIGURED
              indica identificadores, credenciales o sesión de Google
              pendientes.
            </p>
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    <th>Destino</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                    <th>Eventos</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.deliveries.map((d, i) => (
                    <tr key={i}>
                      <td>{d.provider}</td>
                      <td>{d.status}</td>
                      <td>{d.lastError || "—"}</td>
                      <td>{d._count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!summary.deliveries.length && (
              <p>Aún no hay conversiones para enviar.</p>
            )}
          </section>
          <small>
            Actualizado: {new Date(summary.updatedAt).toLocaleString("es-MX")}
          </small>
        </>
      )}
      {tab === "visits" && visits && (
        <section className={styles.panel}>
          <h2>Visitas y procedencia</h2>
          <p className={styles.note}>
            Las IP se eliminan al cumplir la retención configurada. No
            identifican de forma fiable a una persona. Las palabras de campaña
            provienen de utm_term, no de consultas individuales a Google o
            asistentes.
          </p>
          <div className={styles.table}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Entrada</th>
                  <th>Fuente / medio</th>
                  <th>Primer origen / último no directo</th>
                  <th>Campaña / término</th>
                  <th>Referente</th>
                  <th>IP</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {visits.items.map((v) => (
                  <tr key={v.id}>
                    <td>{new Date(v.createdAt).toLocaleString("es-MX")}</td>
                    <td>{v.entryPath}</td>
                    <td>
                      {v.source} / {v.medium}
                    </td>
                    <td>
                      {v.firstSource} / {v.lastNonDirectSource}
                    </td>
                    <td>
                      {v.campaign || "—"} / {v.term || "—"}
                    </td>
                    <td>{v.referrer || "—"}</td>
                    <td>{v.ip || "No conservada"}</td>
                    <td>{v.userId || "Anónimo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visits.items.length && <p>No hay visitas en este período.</p>}
          <footer>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} · {visits.total} sesiones
            </span>
            <button
              disabled={page * 50 >= visits.total || loading}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </button>
          </footer>
        </section>
      )}
      {tab === "google" && reports && (
        <>
          <p className={styles.note}>
            Fuente: APIs de Google. Estos datos tienen sus propios tiempos de
            procesamiento y reglas; no se suman al registro propio. Caché de 15
            minutos.
          </p>
          {(reports.error || reports.message) && (
            <p role="status">{reports.error || reports.message}</p>
          )}
          <section className={styles.panel}>
            <h2>GA4 · Adquisición y ubicación aproximada</h2>
            {reports.ga4?.error && <p role="alert">{reports.ga4.error}</p>}
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    {[
                      "Fuente / medio",
                      "País",
                      "Ciudad",
                      "Usuarios",
                      "Sesiones",
                      "Vistas",
                      "Ingresos",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.ga4?.rows?.map((r, i) => (
                    <tr key={i}>
                      {[...r.dimensionValues, ...r.metricValues].map((v, j) => (
                        <td key={j}>{v.value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!reports.ga4?.rows?.length && (
              <p>
                Sin datos disponibles. Revisa la propiedad GA4 y el acceso de la
                cuenta de servicio.
              </p>
            )}
          </section>
          <section className={styles.panel}>
            <h2>Search Console · Consultas de Google</h2>
            <p className={styles.note}>
              Estadísticas agregadas. Algunas búsquedas se omiten por privacidad
              y no se vinculan a visitantes ni compras individuales.
            </p>
            {reports.searchConsole?.error && (
              <p role="alert">{reports.searchConsole.error}</p>
            )}
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    <th>Consulta</th>
                    <th>Página</th>
                    <th>Clics</th>
                    <th>Impresiones</th>
                    <th>CTR</th>
                    <th>Posición</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.searchConsole?.rows?.map((r, i) => (
                    <tr key={i}>
                      <td>{r.keys[0]}</td>
                      <td>{r.keys[1]}</td>
                      <td>{r.clicks}</td>
                      <td>{r.impressions}</td>
                      <td>{(r.ctr * 100).toFixed(1)}%</td>
                      <td>{r.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!reports.searchConsole?.rows?.length && (
              <p>Sin consultas disponibles para este período.</p>
            )}
          </section>
          {reports.updatedAt && (
            <small>
              Última consulta:{" "}
              {new Date(reports.updatedAt).toLocaleString("es-MX")}
            </small>
          )}
        </>
      )}
    </main>
  );
}
