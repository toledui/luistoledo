import styles from "@/components/blog/blog.module.css";
export default function BlogLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.wrap} role="status">
        Cargando artículos…
      </div>
    </main>
  );
}
