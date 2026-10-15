"use client";
import { useEffect, useState } from "react";
import { paidCourseClose } from "@/lib/paid-course";
import styles from "./paid-course.module.css";
export function Countdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const update = () =>
      setRemaining(
        Math.max(0, new Date(paidCourseClose).getTime() - Date.now()),
      );
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);
  if (remaining === 0)
    return (
      <div className={styles.countdown}>
        <strong>Inscripciones cerradas</strong>
        <span>
          La primera sesión es el 21 de noviembre, a las 9:00 a. m. CDMX.
        </span>
      </div>
    );
  const total = Math.floor((remaining ?? 0) / 1000);
  const units = [
    Math.floor(total / 86400),
    Math.floor(total / 3600) % 24,
    Math.floor(total / 60) % 60,
    total % 60,
  ];
  return (
    <div className={styles.countdown}>
      <div>
        <strong>Tu siguiente paso tiene fecha.</strong>
        <span>Inscripciones hasta el 18 de noviembre, 23:59 · Hora CDMX</span>
      </div>
      <div
        className={styles.clock}
        aria-label="Tiempo restante para inscribirte"
      >
        {["Días", "Horas", "Min", "Seg"].map((label, index) => (
          <span key={label}>
            <b>
              {remaining === null ? "—" : String(units[index]).padStart(2, "0")}
            </b>
            <small>{label}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
