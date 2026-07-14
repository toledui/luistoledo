import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <Link href="/" className={styles.brand}>
          <span>LT</span>
          <strong>Luis Toledo Academy</strong>
        </Link>
        <div className={styles.copy}>
          <span>Acceso a la academia</span>
          <h1>Bienvenido de nuevo.</h1>
          <p>Ingresa para continuar con tus cursos y administrar tu cuenta.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
