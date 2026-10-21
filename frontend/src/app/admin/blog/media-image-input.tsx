"use client";
/* eslint-disable @next/next/no-img-element -- CMS images support arbitrary URLs and native loading. */
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useSessionUser } from "@/components/admin/admin-shell";
import styles from "./blog-admin.module.css";
type Asset = { id: string; name: string; url: string; altText?: string | null };
export function MediaImageInput({
  value,
  onChange,
  label = "URL de la imagen",
}: {
  value: string;
  onChange: (url: string, alt?: string) => void;
  label?: string;
}) {
  const user = useSessionUser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function library() {
    setBusy(true);
    setError("");
    try {
      setAssets(await apiFetch<Asset[]>("/admin/media?kind=IMAGE"));
      setOpen(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo abrir la biblioteca",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const asset = await apiFetch<Asset>("/admin/media/upload", {
        method: "POST",
        body,
      });
      onChange(asset.url, asset.altText || asset.name);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.fields}>
      <label>
        {label}
        <input
          inputMode="url"
          maxLength={2000}
          placeholder="https://…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      {user?.permissions.includes("media.manage") && (
        <div className={styles.upload}>
          <button type="button" onClick={() => void library()} disabled={busy}>
            {busy ? "Cargando…" : "Elegir de la biblioteca"}
          </button>
          <label className={styles.field}>
            Subir imagen
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={busy}
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {open && (
        <div className={styles.library}>
          <div className={styles.header}>
            <strong>Selecciona una imagen</strong>
            <button type="button" onClick={() => setOpen(false)}>
              Cerrar
            </button>
          </div>
          <div className={styles.mediaGrid}>
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => {
                  onChange(asset.url, asset.altText || asset.name);
                  setOpen(false);
                }}
              >
                <img
                  src={asset.url}
                  alt={asset.altText || asset.name}
                  loading="lazy"
                />
                <span>{asset.name}</span>
              </button>
            ))}
          </div>
          {!assets.length && (
            <p className={styles.muted}>
              Todavía no hay imágenes en la biblioteca.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
