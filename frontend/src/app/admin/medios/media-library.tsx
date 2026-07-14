"use client";

import { apiFetch } from "@/lib/api";
import { ConfirmModal } from "@/components/admin/modal";
import {
  Check,
  Copy,
  FileText,
  Film,
  ImageIcon,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import styles from "./media.module.css";

type Kind = "IMAGE" | "DOCUMENT" | "VIDEO_EMBED";
type Asset = {
  id: string;
  kind: Kind;
  name: string;
  url: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  provider?: string;
  altText?: string;
  createdAt: string;
  uploadedBy?: { firstName: string; lastName: string };
};

export function MediaLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [kind, setKind] = useState<"" | Kind>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [video, setVideo] = useState({ name: "", url: "", altText: "" });
  const [deleting, setDeleting] = useState<Asset | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    if (search) params.set("search", search);
    try {
      setAssets(await apiFetch<Asset[]>(`/admin/media?${params}`));
    } catch (value) {
      setError(true);
      setMessage(
        value instanceof Error
          ? value.message
          : "No fue posible cargar los medios.",
      );
    } finally {
      setLoading(false);
    }
  }, [kind, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setMessage("");
    const body = new FormData();
    body.append("file", file);
    try {
      await apiFetch("/admin/media/upload", { method: "POST", body });
      setError(false);
      setMessage("Archivo guardado en la biblioteca.");
      await load();
    } catch (value) {
      setError(true);
      setMessage(
        value instanceof Error
          ? value.message
          : "No fue posible subir el archivo.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function addVideo(event: React.FormEvent) {
    event.preventDefault();
    setUploading(true);
    setMessage("");
    try {
      await apiFetch("/admin/media/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(video),
      });
      setVideo({ name: "", url: "", altText: "" });
      setVideoOpen(false);
      setError(false);
      setMessage("Video externo registrado.");
      await load();
    } catch (value) {
      setError(true);
      setMessage(
        value instanceof Error
          ? value.message
          : "No fue posible registrar el video.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function remove(asset: Asset) {
    await apiFetch(`/admin/media/${asset.id}`, { method: "DELETE" });
    setAssets((current) => current.filter((item) => item.id !== asset.id));
    setDeleting(null);
  }

  return (
    <main className={styles.page}>
      <header>
        <div>
          <span>Contenido · Biblioteca</span>
          <h1>Medios y recursos.</h1>
          <p>
            Imágenes y documentos locales; videos mediante plataformas externas.
          </p>
        </div>
        <div className={styles.actions}>
          <label>
            {uploading ? (
              <LoaderCircle className={styles.spin} size={17} />
            ) : (
              <Upload size={17} />
            )}
            Subir archivo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              disabled={uploading}
              onChange={(event) => {
                void upload(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <button onClick={() => setVideoOpen(true)}>
            <Plus size={17} />
            Agregar video externo
          </button>
        </div>
      </header>
      <section className={styles.summary}>
        <article>
          <ImageIcon />
          <strong>{assets.filter((a) => a.kind === "IMAGE").length}</strong>
          <small>Imágenes</small>
        </article>
        <article>
          <FileText />
          <strong>{assets.filter((a) => a.kind === "DOCUMENT").length}</strong>
          <small>Documentos</small>
        </article>
        <article>
          <Film />
          <strong>
            {assets.filter((a) => a.kind === "VIDEO_EMBED").length}
          </strong>
          <small>Videos externos</small>
        </article>
        <aside>
          <strong>Los videos no ocupan almacenamiento</strong>
          <small>
            ScreenPal, Adilo, Vimeo, YouTube u otro proveedor HTTPS.
          </small>
        </aside>
      </section>
      <section className={styles.filters}>
        <label>
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar recursos"
          />
        </label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "" | Kind)}
        >
          <option value="">Todos los tipos</option>
          <option value="IMAGE">Imágenes</option>
          <option value="DOCUMENT">Documentos</option>
          <option value="VIDEO_EMBED">Videos externos</option>
        </select>
      </section>
      {message && (
        <div className={`${styles.message} ${error ? styles.error : ""}`}>
          {error ? null : <Check size={16} />} {message}
        </div>
      )}
      {loading ? (
        <div className={styles.empty}>
          <LoaderCircle className={styles.spin} />
          Cargando biblioteca…
        </div>
      ) : assets.length ? (
        <section className={styles.grid}>
          {assets.map((asset) => (
            <article className={styles.card} key={asset.id}>
              <div className={styles.visual}>
                {asset.kind === "IMAGE" ? (
                  <Image
                    src={asset.url}
                    alt={asset.altText || asset.name}
                    fill
                    sizes="260px"
                    quality={85}
                  />
                ) : asset.kind === "VIDEO_EMBED" ? (
                  <Film size={40} />
                ) : (
                  <FileText size={40} />
                )}
                <span>
                  {asset.provider || asset.kind.replace("_EMBED", "")}
                </span>
              </div>
              <div className={styles.cardBody}>
                <strong title={asset.name}>{asset.name}</strong>
                <small>
                  {asset.sizeBytes
                    ? `${(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB`
                    : asset.provider || "Enlace externo"}
                </small>
                <div>
                  <button
                    title="Copiar URL"
                    onClick={() =>
                      void navigator.clipboard.writeText(asset.url)
                    }
                  >
                    <Copy size={15} />
                  </button>
                  <a href={asset.url} target="_blank" rel="noreferrer">
                    Abrir
                  </a>
                  <button
                    className={styles.delete}
                    title="Eliminar"
                    onClick={() => setDeleting(asset)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className={styles.empty}>
          <ImageIcon size={38} />
          <strong>Tu biblioteca está vacía</strong>
          <span>Sube una imagen, documento o registra un video externo.</span>
        </div>
      )}
      {videoOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setVideoOpen(false)}
        >
          <form
            className={styles.modal}
            onSubmit={addVideo}
            onClick={(e) => e.stopPropagation()}
          >
            <Film size={28} />
            <h2>Agregar video externo</h2>
            <p>
              Pega el enlace HTTPS para embeberlo posteriormente en una lección.
              El archivo permanecerá en tu proveedor.
            </p>
            <label>
              Nombre del video
              <input
                required
                maxLength={191}
                value={video.name}
                onChange={(e) => setVideo({ ...video, name: e.target.value })}
              />
            </label>
            <label>
              URL de ScreenPal, Adilo u otro proveedor
              <input
                required
                type="url"
                pattern="https://.*"
                placeholder="https://…"
                value={video.url}
                onChange={(e) => setVideo({ ...video, url: e.target.value })}
              />
            </label>
            <label>
              Descripción accesible
              <input
                maxLength={255}
                value={video.altText}
                onChange={(e) =>
                  setVideo({ ...video, altText: e.target.value })
                }
              />
            </label>
            <div>
              <button type="button" onClick={() => setVideoOpen(false)}>
                Cancelar
              </button>
              <button disabled={uploading}>
                {uploading ? (
                  <LoaderCircle className={styles.spin} />
                ) : (
                  <Plus />
                )}
                Registrar video
              </button>
            </div>
          </form>
        </div>
      )}
      <ConfirmModal
        open={deleting !== null}
        title="Eliminar recurso"
        description={`Se eliminará “${deleting?.name ?? "este recurso"}” de la biblioteca${deleting?.kind === "VIDEO_EMBED" ? "." : " y también su archivo almacenado."}`}
        confirmLabel="Sí, eliminar"
        destructive
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void remove(deleting);
        }}
      />
    </main>
  );
}
