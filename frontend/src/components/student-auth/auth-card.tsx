import Link from "next/link";
import styles from "./student-auth.module.css";
export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <Link href="/" className={styles.brand}>
          <span>LT</span>
          <strong>Luis Toledo Academy</strong>
        </Link>
        <header>
          <small>{eyebrow}</small>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
        {footer && <footer>{footer}</footer>}
      </section>
    </main>
  );
}
