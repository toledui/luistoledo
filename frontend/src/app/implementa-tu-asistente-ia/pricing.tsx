"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, LockKeyhole } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ProductView } from "@/components/analytics/product-view";
import {
  formatMxn,
  paidCourseClose,
  type PaidCourseOffer,
} from "@/lib/paid-course";
import styles from "./paid-course.module.css";
export function Pricing() {
  const [offer, setOffer] = useState<PaidCourseOffer | null>(null);
  const [error, setError] = useState("");
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () =>
      apiFetch<PaidCourseOffer>("/paid-course")
        .then((data) => {
          if (active) {
            setOffer(data);
            setClosed(!data.registrationOpen);
          }
        })
        .catch(() => {
          if (active)
            setError(
              "No pudimos cargar las opciones de inscripción. Recarga la página para intentarlo de nuevo.",
            );
        });
    void load();
    const timer = window.setInterval(() => {
      if (Date.now() > new Date(paidCourseClose).getTime()) setClosed(true);
    }, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!offer)
    return <p role="status">Preparando tus opciones de inscripción…</p>;
  return (
    <>
      <ProductView id={offer.courseId || "asistente-ia-noviembre-2026"} title={offer.title} value={offer.cashPrice} />
      <div className={styles.prices}>
        <article className={styles.cash}>
          <div className={styles.priceBadge}>La mejor inversión</div>
          <span>Pago de contado</span>
          <h3>Todo listo. Un solo pago.</h3>
          <p className={styles.regular}>
            Precio regular <s>{formatMxn(offer.regularPrice)}</s>
          </p>
          <p className={styles.amount}>{formatMxn(offer.cashPrice)}</p>
          <p>
            Ahorras {formatMxn(offer.regularPrice - offer.cashPrice)} sobre el
            precio regular.
          </p>
          <ul>
            <li>
              <Check size={18} />
              Las tres sesiones en vivo
            </li>
            <li>
              <Check size={18} />
              Materiales, guías y grabaciones
            </li>
            <li>
              <Check size={18} />
              Acceso al grupo del curso
            </li>
            <li>
              <Check size={18} />
              Sin pagos posteriores del curso
            </li>
          </ul>
          {closed ? (
            <p className={styles.closed}>Inscripciones cerradas</p>
          ) : (
            <Link
              href="/checkout?program=asistente-ia&plan=FULL"
              className={styles.primary}
            >
              Inscribirme de contado <ArrowUpRight size={20} />
            </Link>
          )}
        </article>
        <article className={styles.installments}>
          <span>Plan en parcialidades</span>
          <h3>Aparta hoy. Implementa con nosotros.</h3>
          <p className={styles.regular}>Tu lugar comienza con</p>
          <p className={styles.amount}>{formatMxn(offer.deposit)}</p>
          <p>
            + 2 pagos de {formatMxn(offer.installmentAmount)}. Total:{" "}
            <strong>{formatMxn(offer.installmentTotal)}</strong>.
          </p>
          <ol className={styles.schedule}>
            <li>
              <span>01 · Hoy</span>
              <strong>{formatMxn(offer.deposit)}</strong>
            </li>
            {offer.installmentDueDates.map((date, index) => (
              <li key={date}>
                <span>
                  0{index + 2} ·{" "}
                  {new Date(date).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "long",
                    timeZone: offer.timezone,
                  })}
                </span>
                <strong>{formatMxn(offer.installmentAmount)}</strong>
              </li>
            ))}
          </ol>
          <p>
            Después de confirmar tu apartado, verás las dos órdenes restantes en
            tu cuenta. Un solo recordatorio semanal, sin cobros automáticos.
          </p>
          {closed ? (
            <p className={styles.closed}>Inscripciones cerradas</p>
          ) : (
            <Link
              href="/checkout?program=asistente-ia&plan=INSTALLMENTS"
              className={styles.secondary}
            >
              Apartar mi lugar <ArrowUpRight size={20} />
            </Link>
          )}
        </article>
      </div>
      <p className={styles.paymentNote}>
        <LockKeyhole size={17} />
        Checkout de Luis Toledo Academy · Tarjeta o transferencia, según
        disponibilidad. El servidor y el consumo de IA se pagan por separado.
      </p>
    </>
  );
}
