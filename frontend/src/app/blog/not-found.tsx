import Link from "next/link";
import styles from "@/components/blog/blog.module.css";
export default function BlogNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <span className={styles.eyebrow}>Blog · Luis Toledo</span>
        <h1 className={styles.heading}>Este contenido no está disponible.</h1>
        <p className={styles.intro}>
          El artículo o la categoría puede haber cambiado o dejado de
          publicarse. Puedes seguir explorando nuestras publicaciones.
        </p>
        <Link href="/blog" className={styles.cta}>
          Volver al blog →
        </Link>
      </div>
    </main>
  );
}
