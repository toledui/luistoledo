"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import styles from "../analitica/analytics.module.css";
type Preview = {
  valid: number;
  invalid: number;
  duplicates: number;
  totalRows: number;
  sample: { name: string; email: string; phone?: string }[];
  errors: { line: number; message: string }[];
};
export function CsvImporter({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<Preview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function inspect() {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    setPreview(undefined);
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error("El archivo debe pesar como máximo 2 MB");
      const body = new FormData();
      body.append("file", file);
      setPreview(
        await apiFetch<Preview>("/admin/sendcorex/imports/preview", {
          method: "POST",
          body,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo");
    } finally {
      setBusy(false);
    }
  }
  async function importContacts() {
    if (!file || !preview?.valid) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await apiFetch<{ total: number }>(
        "/admin/sendcorex/imports",
        { method: "POST", body },
      );
      setMessage(
        `Importación iniciada para ${result.total} contactos. Consulta el avance en Últimas importaciones. Se enviarán a Sendcorex cuando la integración esté activa.`,
      );
      setPreview(undefined);
      onImported();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo iniciar la importación",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.panel}>
      <h2>Importar directorio desde CSV</h2>
      <p>
        Hasta 10,000 filas y 2 MB por archivo, en UTF-8. Se aceptan comas, punto
        y coma o tabuladores. La columna email o correo es obligatoria; nombre,
        apellidos y teléfono son opcionales.
      </p>
      <p>
        Los correos repetidos se combinan. Los contactos existentes se
        actualizan sin crear duplicados. Se agregan las etiquetas importado y
        directorio; se conservan las bajas de Sendcorex.
      </p>
      <p>
        <a href="/plantilla-contactos.csv" download>
          Descargar plantilla CSV
        </a>
      </p>
      <div className={styles.toolbar}>
        <label>
          Archivo CSV{" "}
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            disabled={busy}
            onChange={(event) => {
              setFile(event.target.files?.[0]);
              setPreview(undefined);
              setError("");
              setMessage("");
            }}
          />
        </label>
        <button type="button" disabled={!file || busy} onClick={inspect}>
          {busy ? "Procesando…" : "Revisar archivo"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {preview && (
        <>
          <p role="status">
            {preview.totalRows} filas: {preview.valid} contactos únicos válidos,{" "}
            {preview.duplicates} duplicados combinados y {preview.invalid} filas
            inválidas que se omitirán.
          </p>
          <div className={styles.table}>
            <table>
              <caption>Vista previa de los primeros 10 contactos</caption>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((row) => (
                  <tr key={row.email}>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>{row.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.errors.length > 0 && (
            <details>
              <summary>Ver errores (hasta 50)</summary>
              <ul>
                {preview.errors.map((error) => (
                  <li key={error.line}>
                    Línea {error.line}: {error.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <button
            type="button"
            disabled={busy || !preview.valid}
            onClick={importContacts}
          >
            {busy
              ? "Iniciando importación…"
              : `Importar ${preview.valid} contactos válidos`}
          </button>
        </>
      )}
    </section>
  );
}
