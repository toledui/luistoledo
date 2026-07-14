"use client";

import {
  AlertTriangle,
  Building2,
  Check,
  CircleCheckBig,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Save,
  ShoppingCart,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { apiFetch, ApiError } from "@/lib/api";
import styles from "./setup.module.css";

type GeneralForm = {
  academyName: string;
  legalName: string;
  tagline: string;
  generalEmail: string;
  supportEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  timezone: string;
  defaultLocale: string;
  defaultCurrency: string;
  registrationEnabled: boolean;
  checkoutEnabled: boolean;
  maintenanceEnabled: boolean;
  initialSetupCompleted: boolean;
};

const defaults: GeneralForm = {
  academyName: "Luis Toledo Academy",
  legalName: "",
  tagline: "",
  generalEmail: "",
  supportEmail: "",
  phone: "",
  whatsapp: "",
  address: "",
  country: "México",
  state: "",
  city: "",
  postalCode: "",
  timezone: "America/Mexico_City",
  defaultLocale: "es-MX",
  defaultCurrency: "MXN",
  registrationEnabled: true,
  checkoutEnabled: true,
  maintenanceEnabled: false,
  initialSetupCompleted: false,
};

function editableGeneral(value: GeneralForm): GeneralForm {
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [
      key,
      value[key as keyof GeneralForm] ?? fallback,
    ]),
  ) as GeneralForm;
}

export function InitialSetupForm() {
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("Cargando configuración…");
  const [messageType, setMessageType] = useState<"info" | "success" | "error">(
    "info",
  );
  const [saving, setSaving] = useState(false);
  const {
    register,
    reset,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<GeneralForm>({ defaultValues: defaults });
  const router = useRouter();
  const completed = useWatch({ control, name: "initialSetupCompleted" });

  const connect = useCallback(async () => {
    setSaving(true);
    try {
      reset(
        editableGeneral(await apiFetch<GeneralForm>("/admin/settings/general")),
      );
      setConnected(true);
      setMessageType("info");
      setMessage("Configuración sincronizada con MySQL.");
    } catch (error) {
      setConnected(false);
      if (error instanceof ApiError && error.status === 401)
        router.replace("/login");
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Error de conexión.");
    } finally {
      setSaving(false);
    }
  }, [reset, router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void connect(), 0);
    return () => window.clearTimeout(timeout);
  }, [connect]);

  async function save(values: GeneralForm) {
    setSaving(true);
    try {
      const payload = {
        academyName: values.academyName,
        legalName: values.legalName,
        tagline: values.tagline,
        generalEmail: values.generalEmail || undefined,
        supportEmail: values.supportEmail || undefined,
        phone: values.phone,
        whatsapp: values.whatsapp,
        address: values.address,
        country: values.country,
        state: values.state,
        city: values.city,
        postalCode: values.postalCode,
        timezone: values.timezone,
        defaultLocale: values.defaultLocale,
        defaultCurrency: values.defaultCurrency,
        registrationEnabled: values.registrationEnabled,
        checkoutEnabled: values.checkoutEnabled,
        maintenanceEnabled: values.maintenanceEnabled,
        initialSetupCompleted: true,
      };
      const updated = await apiFetch<GeneralForm>("/admin/settings/general", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      reset(editableGeneral(updated));
      setMessageType("success");
      setMessage("Configuración guardada, completada y publicada.");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.workspace}>
      <div className={styles.panel}>
        <div className={styles.tokenBox}>
          <div>
            <LockKeyhole size={20} />
            <span>
              <strong>Configuración protegida</strong>
              <small>{message}</small>
            </span>
          </div>
          <div className={styles.tokenControls}>
            <button type="button" onClick={connect} disabled={saving}>
              {saving ? (
                <LoaderCircle className={styles.spin} size={17} />
              ) : connected ? (
                <Check size={17} />
              ) : null}
              {connected ? "Sincronizar" : "Reintentar"}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(save)} className={styles.form}>
          <div className={styles.formHeading}>
            <div>
              <span>Información institucional</span>
              <h2>Datos de la academia</h2>
            </div>
            <p>Estos datos alimentarán el sitio público, correos y checkout.</p>
          </div>
          <div
            className={`${styles.statusCard} ${completed ? styles.complete : ""}`}
          >
            {completed ? (
              <CircleCheckBig size={22} />
            ) : (
              <AlertTriangle size={22} />
            )}
            <div>
              <strong>
                {completed
                  ? "Configuración inicial completada"
                  : "Configuración inicial pendiente"}
              </strong>
              <small>
                {completed
                  ? "La plataforma ya cuenta con una configuración general publicada."
                  : "Revisa los datos y guarda para marcar esta etapa como completada."}
              </small>
            </div>
          </div>
          <div className={styles.groupTitle}>
            <Building2 size={18} />
            <div>
              <h3>Identidad</h3>
              <p>Nombre comercial y datos legales.</p>
            </div>
          </div>
          <div className={styles.grid}>
            <label className={styles.full}>
              Nombre de la academia
              <input
                {...register("academyName", {
                  required: "El nombre es obligatorio",
                  maxLength: 120,
                })}
                disabled={!connected}
              />
              {errors.academyName && (
                <small className={styles.fieldError}>
                  {errors.academyName.message}
                </small>
              )}
            </label>
            <label>
              Nombre legal
              <input {...register("legalName")} disabled={!connected} />
            </label>
            <label>
              País
              <input {...register("country")} disabled={!connected} />
            </label>
            <label className={styles.full}>
              Eslogan
              <input {...register("tagline")} disabled={!connected} />
            </label>
          </div>
          <div className={styles.groupTitle}>
            <Mail size={18} />
            <div>
              <h3>Contacto</h3>
              <p>Canales que verán alumnos y clientes.</p>
            </div>
          </div>
          <div className={styles.grid}>
            <label>
              Correo general
              <input
                type="email"
                {...register("generalEmail")}
                disabled={!connected}
              />
            </label>
            <label>
              Correo de soporte
              <input
                type="email"
                {...register("supportEmail")}
                disabled={!connected}
              />
            </label>
            <label>
              Teléfono
              <input {...register("phone")} disabled={!connected} />
            </label>
            <label>
              WhatsApp
              <input {...register("whatsapp")} disabled={!connected} />
            </label>
          </div>
          <div className={styles.groupTitle}>
            <MapPin size={18} />
            <div>
              <h3>Ubicación y región</h3>
              <p>Datos utilizados en comprobantes, fechas y precios.</p>
            </div>
          </div>
          <div className={styles.grid}>
            <label className={styles.full}>
              Dirección
              <input {...register("address")} disabled={!connected} />
            </label>
            <label>
              Estado
              <input {...register("state")} disabled={!connected} />
            </label>
            <label>
              Ciudad
              <input {...register("city")} disabled={!connected} />
            </label>
            <label>
              Código postal
              <input
                inputMode="numeric"
                {...register("postalCode")}
                disabled={!connected}
              />
            </label>
            <label>
              Zona horaria
              <select {...register("timezone")} disabled={!connected}>
                <option value="America/Mexico_City">America/Mexico_City</option>
              </select>
            </label>
            <label>
              Configuración regional
              <select {...register("defaultLocale")} disabled={!connected}>
                <option value="es-MX">Español (México)</option>
              </select>
            </label>
            <label>
              Moneda predeterminada
              <select {...register("defaultCurrency")} disabled={!connected}>
                <option value="MXN">Peso mexicano (MXN)</option>
              </select>
            </label>
          </div>
          <div className={styles.groupTitle}>
            <ShoppingCart size={18} />
            <div>
              <h3>Operación de la plataforma</h3>
              <p>Controla temporalmente el acceso a funciones públicas.</p>
            </div>
          </div>
          <div className={styles.switches}>
            <label>
              <input
                type="checkbox"
                {...register("registrationEnabled")}
                disabled={!connected}
              />
              <span>
                <strong>Registro de alumnos</strong>
                <small>Permitir nuevas cuentas</small>
              </span>
            </label>
            <label>
              <input
                type="checkbox"
                {...register("checkoutEnabled")}
                disabled={!connected}
              />
              <span>
                <strong>Checkout</strong>
                <small>Permitir nuevas compras</small>
              </span>
            </label>
            <label>
              <input
                type="checkbox"
                {...register("maintenanceEnabled")}
                disabled={!connected}
              />
              <span>
                <strong>Modo mantenimiento</strong>
                <small>Ocultar temporalmente el sitio público</small>
              </span>
            </label>
          </div>
          {message && (
            <div
              className={`${styles.feedback} ${styles[messageType]}`}
              role={messageType === "error" ? "alert" : "status"}
            >
              {messageType === "error" ? (
                <AlertTriangle size={17} />
              ) : (
                <Check size={17} />
              )}{" "}
              {message}
            </div>
          )}
          <div className={styles.actions}>
            <Link href="/">Volver al sitio</Link>
            <button disabled={!connected || saving}>
              <Save size={17} />
              Guardar y completar configuración
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
