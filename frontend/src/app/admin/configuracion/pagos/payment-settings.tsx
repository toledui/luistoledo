"use client";

import { apiFetch } from "@/lib/api";
import { CreditCard, Landmark, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./payments.module.css";

type Settings = {
  stripeEnabled: boolean;
  stripeMode: "TEST" | "LIVE";
  stripePublishableKey?: string;
  stripeSecretConfigured: boolean;
  stripeWebhookConfigured: boolean;
  bankTransferEnabled: boolean;
  bankName?: string;
  bankBeneficiary?: string;
  bankAccount?: string;
  bankClabe?: string;
  bankInstructions?: string;
  paymentDeadlineHours: number;
};

const empty: Settings = {
  stripeEnabled: false,
  stripeMode: "TEST",
  stripeSecretConfigured: false,
  stripeWebhookConfigured: false,
  bankTransferEnabled: true,
  paymentDeadlineHours: 48,
};

export function PaymentSettings() {
  const [form, setForm] = useState<Settings>(empty);
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void apiFetch<Settings>("/admin/settings/payments")
      .then(setForm)
      .finally(() => setLoading(false));
  }, []);

  function field<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const updated = await apiFetch<Settings>("/admin/settings/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripeEnabled: form.stripeEnabled,
          stripeMode: form.stripeMode,
          stripePublishableKey: form.stripePublishableKey,
          stripeSecretKey: stripeSecretKey || undefined,
          stripeWebhookSecret: stripeWebhookSecret || undefined,
          bankTransferEnabled: form.bankTransferEnabled,
          bankName: form.bankName,
          bankBeneficiary: form.bankBeneficiary,
          bankAccount: form.bankAccount,
          bankClabe: form.bankClabe,
          bankInstructions: form.bankInstructions,
          paymentDeadlineHours: form.paymentDeadlineHours,
        }),
      });
      setForm(updated);
      setStripeSecretKey("");
      setStripeWebhookSecret("");
      setMessage("Configuración de pagos guardada en MySQL.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <main className={styles.state}><LoaderCircle /> Cargando pagos…</main>;

  return (
    <main className={styles.page}>
      <header>
        <div><span>Configuración · Pagos</span><h1>Pasarelas de pago</h1><p>Stripe confirma automáticamente; las transferencias requieren aprobación administrativa.</p></div>
        <ShieldCheck />
      </header>
      <section>
        <div className={styles.sectionTitle}><CreditCard /><div><h2>Stripe Checkout</h2><p>Las claves secretas se almacenan cifradas y nunca vuelven al navegador.</p></div><label><input type="checkbox" checked={form.stripeEnabled} onChange={(e) => field("stripeEnabled", e.target.checked)} /> Activar</label></div>
        <div className={styles.grid}>
          <label>Modo<select value={form.stripeMode} onChange={(e) => field("stripeMode", e.target.value as "TEST" | "LIVE")}><option value="TEST">Pruebas</option><option value="LIVE">Producción</option></select></label>
          <label>Publishable key<input value={form.stripePublishableKey || ""} onChange={(e) => field("stripePublishableKey", e.target.value)} placeholder="pk_test_…" /></label>
          <label>Secret key<input type="password" value={stripeSecretKey} onChange={(e) => setStripeSecretKey(e.target.value)} placeholder={form.stripeSecretConfigured ? "Configurada · escribe para sustituir" : "sk_test_…"} /></label>
          <label>Webhook secret<input type="password" value={stripeWebhookSecret} onChange={(e) => setStripeWebhookSecret(e.target.value)} placeholder={form.stripeWebhookConfigured ? "Configurado · escribe para sustituir" : "whsec_…"} /></label>
        </div>
        <div className={styles.webhook}><strong>Endpoint del webhook</strong><code>http://localhost:4000/api/v1/payments/webhooks/stripe</code><span>Eventos: checkout.session.completed</span></div>
      </section>
      <section>
        <div className={styles.sectionTitle}><Landmark /><div><h2>Transferencia bancaria</h2><p>El pedido queda pendiente hasta que un administrador confirme el depósito.</p></div><label><input type="checkbox" checked={form.bankTransferEnabled} onChange={(e) => field("bankTransferEnabled", e.target.checked)} /> Activar</label></div>
        <div className={styles.grid}>
          <label>Banco<input value={form.bankName || ""} onChange={(e) => field("bankName", e.target.value)} /></label>
          <label>Beneficiario<input value={form.bankBeneficiary || ""} onChange={(e) => field("bankBeneficiary", e.target.value)} /></label>
          <label>Cuenta<input value={form.bankAccount || ""} onChange={(e) => field("bankAccount", e.target.value)} /></label>
          <label>CLABE<input maxLength={18} value={form.bankClabe || ""} onChange={(e) => field("bankClabe", e.target.value.replace(/\D/g, ""))} /></label>
          <label>Horas para pagar<input type="number" min={1} value={form.paymentDeadlineHours} onChange={(e) => field("paymentDeadlineHours", Number(e.target.value))} /></label>
          <label className={styles.full}>Instrucciones<textarea value={form.bankInstructions || ""} onChange={(e) => field("bankInstructions", e.target.value)} /></label>
        </div>
      </section>
      <footer><span>{message}</span><button onClick={() => void save()} disabled={saving}>{saving ? <LoaderCircle /> : <Save />} Guardar pagos</button></footer>
    </main>
  );
}
