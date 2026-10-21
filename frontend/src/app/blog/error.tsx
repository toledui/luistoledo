"use client";
import styles from "@/components/blog/blog.module.css";
export default function BlogError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <h1>El blog no está disponible en este momento.</h1>
        <p>Intenta cargarlo nuevamente en unos instantes.</p>
        <button className={styles.cta} onClick={reset}>
          Intentar nuevamente
        </button>
      </div>
    </main>
  );
}
