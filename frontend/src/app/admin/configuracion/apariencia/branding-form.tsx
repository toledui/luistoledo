"use client";

import { apiFetch } from "@/lib/api";
import {
  Check,
  Eye,
  ImageIcon,
  LoaderCircle,
  Palette,
  Save,
  Type,
} from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { applyBranding } from "@/components/public-branding";
import styles from "./branding.module.css";

type Branding = {
  primaryLogoUrl?: string;
  darkLogoUrl?: string;
  faviconUrl?: string;
  openGraphImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  darkBackgroundColor: string;
  lightSurfaceColor: string;
  headingFont: string;
  bodyFont: string;
  footerText?: string;
  borderRadius: number;
};

const defaults: Branding = {
  primaryColor: "#52e1ff",
  secondaryColor: "#a983ff",
  accentColor: "#b8f34a",
  darkBackgroundColor: "#07111f",
  lightSurfaceColor: "#f7faff",
  headingFont: "Space Grotesk",
  bodyFont: "Inter",
  borderRadius: 18,
};

function editableBranding(branding: Branding): Branding {
  return {
    primaryLogoUrl: branding.primaryLogoUrl ?? "",
    darkLogoUrl: branding.darkLogoUrl ?? "",
    faviconUrl: branding.faviconUrl ?? "",
    openGraphImageUrl: branding.openGraphImageUrl ?? "",
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor: branding.accentColor,
    darkBackgroundColor: branding.darkBackgroundColor,
    lightSurfaceColor: branding.lightSurfaceColor,
    headingFont: branding.headingFont,
    bodyFont: branding.bodyFont,
    footerText: branding.footerText ?? "",
    borderRadius: branding.borderRadius,
  };
}

type ColorName =
  | "primaryColor"
  | "secondaryColor"
  | "accentColor"
  | "darkBackgroundColor"
  | "lightSurfaceColor";

function ColorField({
  control,
  name,
  label,
}: {
  control: Control<Branding>;
  name: ColorName;
  label: string;
}) {
  const { field, fieldState } = useController({
    control,
    name,
    rules: { pattern: /^#[0-9a-fA-F]{6}$/ },
  });
  const validColor = /^#[0-9a-fA-F]{6}$/.test(field.value)
    ? field.value
    : "#000000";
  return (
    <label>
      {label}
      <div>
        <input
          aria-label={`Seleccionar ${label.toLowerCase()}`}
          type="color"
          value={validColor}
          onChange={(event) => field.onChange(event.target.value)}
        />
        <input
          {...field}
          aria-invalid={fieldState.invalid}
          maxLength={7}
          spellCheck={false}
          onChange={(event) => field.onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

export function BrandingForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const { register, handleSubmit, reset, control } = useForm<Branding>({
    defaultValues: defaults,
  });
  const values = useWatch({ control, defaultValue: defaults });
  useEffect(() => {
    apiFetch<Branding>("/admin/settings/branding")
      .then((branding) => reset(editableBranding(branding)))
      .catch((error: Error) => {
        setMessageType("error");
        setMessage(error.message);
      })
      .finally(() => setLoading(false));
  }, [reset]);
  async function save(data: Branding) {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...(data.primaryLogoUrl ? { primaryLogoUrl: data.primaryLogoUrl } : {}),
        ...(data.darkLogoUrl ? { darkLogoUrl: data.darkLogoUrl } : {}),
        ...(data.faviconUrl ? { faviconUrl: data.faviconUrl } : {}),
        ...(data.openGraphImageUrl
          ? { openGraphImageUrl: data.openGraphImageUrl }
          : {}),
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        darkBackgroundColor: data.darkBackgroundColor,
        lightSurfaceColor: data.lightSurfaceColor,
        headingFont: data.headingFont,
        bodyFont: data.bodyFont,
        footerText: data.footerText ?? "",
        borderRadius: data.borderRadius,
      };
      const updated = await apiFetch<Branding>("/admin/settings/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      reset(editableBranding(updated));
      applyBranding(updated);
      setMessageType("success");
      setMessage("Branding guardado y publicado.");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error ? error.message : "No fue posible guardar.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function uploadAsset(
    field:
      "primaryLogoUrl" | "darkLogoUrl" | "faviconUrl" | "openGraphImageUrl",
    file?: File,
  ) {
    if (!file) return;
    setUploading(field);
    setMessage("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const updated = await apiFetch<Branding>(
        `/admin/settings/branding/upload/${field}`,
        { method: "POST", body: formData },
      );
      reset(editableBranding(updated));
      applyBranding(updated);
      setMessageType("success");
      setMessage("Archivo subido, guardado y publicado correctamente.");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error ? error.message : "No fue posible subirlo.",
      );
    } finally {
      setUploading(null);
    }
  }
  if (loading)
    return (
      <div className={styles.loading}>
        <LoaderCircle size={22} />
        Cargando apariencia…
      </div>
    );
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span>Configuración · Apariencia</span>
          <h1>Haz que la academia se sienta tuya.</h1>
          <p>
            Los cambios de color, tipografía y marca se publican en el sitio
            mediante la configuración pública.
          </p>
        </div>
        <button form="branding-form" disabled={saving}>
          {saving ? (
            <LoaderCircle className={styles.spin} size={17} />
          ) : (
            <Save size={17} />
          )}
          Guardar cambios
        </button>
      </header>
      <div className={styles.layout}>
        <form
          id="branding-form"
          className={styles.form}
          onSubmit={handleSubmit(save)}
        >
          <section>
            <div className={styles.sectionTitle}>
              <Palette size={19} />
              <div>
                <h2>Paleta de color</h2>
                <p>Define las variables principales del sitio.</p>
              </div>
            </div>
            <div className={styles.colorGrid}>
              {[
                ["primaryColor", "Principal"],
                ["secondaryColor", "Secundario"],
                ["accentColor", "Acento"],
                ["darkBackgroundColor", "Fondo oscuro"],
                ["lightSurfaceColor", "Superficie clara"],
              ].map(([name, label]) => (
                <ColorField
                  control={control}
                  key={name}
                  name={name as ColorName}
                  label={label}
                />
              ))}
            </div>
          </section>
          <section>
            <div className={styles.sectionTitle}>
              <Type size={19} />
              <div>
                <h2>Tipografía y forma</h2>
                <p>Controla la personalidad visual.</p>
              </div>
            </div>
            <div className={styles.twoCols}>
              <label>
                Tipografía de títulos
                <select {...register("headingFont")}>
                  <option>Space Grotesk</option>
                  <option>Inter</option>
                  <option>Montserrat</option>
                  <option>Poppins</option>
                </select>
              </label>
              <label>
                Tipografía de contenido
                <select {...register("bodyFont")}>
                  <option>Inter</option>
                  <option>Roboto</option>
                  <option>Open Sans</option>
                </select>
              </label>
              <label>
                Radio de bordes
                <input
                  type="number"
                  min="0"
                  max="40"
                  {...register("borderRadius", { valueAsNumber: true })}
                />
              </label>
              <label>
                Texto del footer
                <input
                  {...register("footerText")}
                  placeholder="© Luis Toledo Academy"
                />
              </label>
            </div>
          </section>
          <section>
            <div className={styles.sectionTitle}>
              <ImageIcon size={19} />
              <div>
                <h2>Recursos de marca</h2>
                <p>
                  Por ahora acepta URLs; la biblioteca de medios llegará en el
                  siguiente módulo.
                </p>
              </div>
            </div>
            <div className={styles.assetGrid}>
              {(
                [
                  ["primaryLogoUrl", "Logotipo principal", "PNG, JPG o WebP"],
                  [
                    "darkLogoUrl",
                    "Logotipo para fondo oscuro",
                    "PNG transparente recomendado",
                  ],
                  ["faviconUrl", "Favicon", "PNG o ICO"],
                  [
                    "openGraphImageUrl",
                    "Imagen para compartir",
                    "Recomendado: 1200 × 630 px",
                  ],
                ] as const
              ).map(([field, label, hint]) => (
                <div className={styles.asset} key={field}>
                  <div className={styles.assetHeading}>
                    <ImageIcon size={18} />
                    <div>
                      <strong>{label}</strong>
                      <small>{hint} · Máximo 5 MB</small>
                    </div>
                  </div>
                  <input
                    className={styles.assetUrl}
                    type="url"
                    {...register(field)}
                    placeholder="Aún no se ha subido un archivo"
                    readOnly
                  />
                  <label className={styles.uploadButton}>
                    {uploading === field ? (
                      <LoaderCircle className={styles.spin} size={16} />
                    ) : (
                      <ImageIcon size={16} />
                    )}
                    {uploading === field ? "Subiendo…" : "Seleccionar archivo"}
                    <input
                      type="file"
                      accept={
                        field === "faviconUrl"
                          ? "image/png,image/x-icon,image/vnd.microsoft.icon,.ico"
                          : "image/png,image/jpeg,image/webp"
                      }
                      disabled={uploading !== null}
                      onChange={(event) => {
                        void uploadAsset(field, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>
          {message && (
            <div
              className={`${styles.message} ${messageType === "error" ? styles.error : ""}`}
              role={messageType === "error" ? "alert" : "status"}
            >
              <Check size={17} />
              {message}
            </div>
          )}
        </form>
        <aside
          className={styles.preview}
          style={
            {
              "--preview-primary": values.primaryColor,
              "--preview-secondary": values.secondaryColor,
              "--preview-accent": values.accentColor,
              "--preview-dark": values.darkBackgroundColor,
              "--preview-light": values.lightSurfaceColor,
              "--preview-radius": `${values.borderRadius}px`,
            } as React.CSSProperties
          }
        >
          <div className={styles.previewLabel}>
            <Eye size={16} />
            Vista previa
          </div>
          <div className={styles.previewHero}>
            <div className={styles.previewBrand}>
              {values.darkLogoUrl ? (
                <Image
                  src={values.darkLogoUrl}
                  alt="Logo"
                  width={110}
                  height={34}
                  quality={100}
                  sizes="110px"
                />
              ) : (
                <span>LT</span>
              )}
              <strong>Luis Toledo Academy</strong>
            </div>
            <small>Aprende habilidades que generan resultados</small>
            <h2>Convierte experiencia en crecimiento.</h2>
            <p>Desarrollo web, marketing digital y ventas B2B.</p>
            <button>Explorar cursos</button>
            <div className={styles.swatches}>
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className={styles.previewCard}>
            <span>Ruta recomendada</span>
            <h3>Desarrollo Web Full Stack</h3>
            <p>Aprende construyendo proyectos reales.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
