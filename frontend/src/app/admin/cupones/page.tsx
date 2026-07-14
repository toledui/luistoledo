"use client";
import { apiFetch } from "@/lib/api";
import { LoaderCircle, Plus, TicketPercent } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import styles from "../sales-admin.module.css";
type Coupon = {
  id: string;
  code: string;
  description?: string;
  percentOff?: number;
  amountOff?: string;
  active: boolean;
  redemptionCount: number;
};
export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(10);
  const [saving, setSaving] = useState(false);
  const load = () => apiFetch<Coupon[]>("/admin/coupons").then(setItems);
  useEffect(() => {
    void load();
  }, []);
  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, percentOff: percent, active: true }),
      });
      setCode("");
      await load();
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className={styles.page}>
      <header>
        <div>
          <span>Promociones</span>
          <h1>Cupones</h1>
          <p>Crea descuentos calculados y validados desde el servidor.</p>
        </div>
        <TicketPercent />
      </header>
      <form className={styles.couponForm} onSubmit={(e) => void create(e)}>
        <label>
          Código
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="LANZAMIENTO20"
          />
        </label>
        <label>
          Descuento porcentual
          <input
            type="number"
            min="1"
            max="100"
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
          />
        </label>
        <button disabled={saving}>
          {saving ? <LoaderCircle /> : <Plus />}Crear cupón
        </button>
      </form>
      <div className={styles.couponGrid}>
        {items.map((item) => (
          <article key={item.id}>
            <TicketPercent />
            <div>
              <strong>{item.code}</strong>
              <span>
                {item.percentOff
                  ? `${item.percentOff}% de descuento`
                  : `$${item.amountOff} MXN`}
              </span>
            </div>
            <b>{item.active ? "Activo" : "Inactivo"}</b>
            <small>{item.redemptionCount} usos</small>
          </article>
        ))}
      </div>
    </main>
  );
}
