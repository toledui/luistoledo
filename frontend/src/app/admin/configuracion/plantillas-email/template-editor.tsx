"use client";

import { apiFetch } from "@/lib/api";
import {
  Braces,
  Copy,
  Eye,
  LoaderCircle,
  Mail,
  RotateCcw,
  Save,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import styles from "./templates.module.css";

type Template = {
  id: string;
  name: string;
  event: string;
  subject: string;
  preheader?: string;
  htmlContent: string;
  textContent: string;
  locale: string;
  enabled: boolean;
};
type Preview = {
  subject: string;
  preheader?: string;
  html: string;
  text: string;
  variables: string[];
};

export function TemplateEditor() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [variables, setVariables] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const [testRecipient, setTestRecipient] = useState(
    "contacto@luistoledo.com.mx",
  );
  const { register, handleSubmit, reset } = useForm<Template>();
  const loadList = useCallback(async () => {
    const [list, allowed] = await Promise.all([
      apiFetch<Template[]>("/admin/email/templates"),
      apiFetch<string[]>("/admin/email/templates/variables"),
    ]);
    setTemplates(list);
    setVariables(allowed);
    if (!selectedId && list[0]) setSelectedId(list[0].id);
    return list;
  }, [selectedId]);
  useEffect(() => {
    void Promise.all([
      apiFetch<Template[]>("/admin/email/templates"),
      apiFetch<string[]>("/admin/email/templates/variables"),
    ])
      .then(([list, allowed]) => {
        setTemplates(list);
        setVariables(allowed);
        if (list[0]) setSelectedId(list[0].id);
      })
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    if (!selectedId) return;
    void apiFetch<Template>(`/admin/email/templates/${selectedId}`)
      .then((value) => {
        reset(value);
        return apiFetch<Preview>(
          `/admin/email/templates/${selectedId}/preview`,
          { method: "POST" },
        );
      })
      .then(setPreview)
      .catch((error: Error) => setMessage(error.message));
  }, [selectedId, reset]);
  async function save(values: Template) {
    setBusy(true);
    setMessage("");
    try {
      const updated = await apiFetch<Template>(
        `/admin/email/templates/${values.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            subject: values.subject,
            preheader: values.preheader || undefined,
            htmlContent: values.htmlContent,
            textContent: values.textContent,
            enabled: values.enabled,
          }),
        },
      );
      reset(updated);
      setPreview(
        await apiFetch<Preview>(`/admin/email/templates/${values.id}/preview`, {
          method: "POST",
        }),
      );
      await loadList();
      setMessage("Plantilla guardada y sanitizada.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible guardar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function action(name: "test" | "reset" | "duplicate") {
    if (!selectedId) return;
    setBusy(true);
    setMessage("");
    try {
      if (name === "test") {
        await apiFetch(`/admin/email/templates/${selectedId}/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient: testRecipient }),
        });
        setMessage("Prueba registrada en el proveedor configurado.");
      } else {
        const result = await apiFetch<Template>(
          `/admin/email/templates/${selectedId}/${name}`,
          { method: "POST" },
        );
        await loadList();
        if (name === "duplicate") setSelectedId(result.id);
        else {
          reset(result);
          setPreview(
            await apiFetch<Preview>(
              `/admin/email/templates/${selectedId}/preview`,
              { method: "POST" },
            ),
          );
        }
        setMessage(
          name === "duplicate"
            ? "Plantilla duplicada."
            : "Plantilla restaurada.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible completar la acción.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (busy && !templates.length)
    return (
      <div className={styles.loading}>
        <LoaderCircle />
        Cargando plantillas…
      </div>
    );
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <span>Configuración · Plantillas</span>
          <h1>Mensajes claros en cada momento.</h1>
          <p>
            Edita contenido seguro para autenticación, compras y aprendizaje.
          </p>
        </div>
        <button form="template-form" disabled={busy}>
          <Save size={17} />
          Guardar plantilla
        </button>
      </header>
      <div className={styles.layout}>
        <aside className={styles.list}>
          <h2>Plantillas</h2>
          {templates.map((template) => (
            <button
              className={selectedId === template.id ? styles.active : ""}
              key={template.id}
              onClick={() => setSelectedId(template.id)}
            >
              <Mail size={16} />
              <span>
                <strong>{template.name}</strong>
                <small>{template.event}</small>
              </span>
              <i className={template.enabled ? styles.on : ""} />
            </button>
          ))}
        </aside>
        <form
          id="template-form"
          className={styles.form}
          onSubmit={handleSubmit(save)}
        >
          <input type="hidden" {...register("id")} />
          <div className={styles.row}>
            <label>
              Nombre interno
              <input {...register("name")} />
            </label>
            <label className={styles.switch}>
              <input type="checkbox" {...register("enabled")} />
              Plantilla activa
            </label>
          </div>
          <label>
            Asunto
            <input {...register("subject")} />
          </label>
          <label>
            Preheader
            <input
              {...register("preheader")}
              placeholder="Resumen visible en la bandeja"
            />
          </label>
          <label>
            Contenido HTML
            <textarea rows={13} {...register("htmlContent")} />
          </label>
          <label>
            Texto plano
            <textarea rows={7} {...register("textContent")} />
          </label>
          <div className={styles.variables}>
            <div>
              <Braces size={16} />
              <strong>Variables permitidas</strong>
            </div>
            <p>
              {variables.map((variable) => (
                <code key={variable}>{`{{${variable}}}`}</code>
              ))}
            </p>
          </div>
          {message && <div className={styles.message}>{message}</div>}
          <div className={styles.actions}>
            <button type="button" onClick={() => action("duplicate")}>
              <Copy size={15} />
              Duplicar
            </button>
            <button type="button" onClick={() => action("reset")}>
              <RotateCcw size={15} />
              Restaurar
            </button>
          </div>
        </form>
        <aside className={styles.preview}>
          <div className={styles.previewTitle}>
            <Eye size={16} />
            <strong>Vista previa</strong>
          </div>
          {preview && (
            <>
              <div className={styles.subject}>
                <small>Asunto</small>
                <strong>{preview.subject}</strong>
              </div>
              <iframe
                title="Vista previa del correo"
                sandbox=""
                srcDoc={preview.html}
              />
              <label>
                Enviar prueba
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(event) => setTestRecipient(event.target.value)}
                />
              </label>
              <button onClick={() => action("test")} disabled={busy}>
                <Send size={15} />
                Enviar prueba
              </button>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
