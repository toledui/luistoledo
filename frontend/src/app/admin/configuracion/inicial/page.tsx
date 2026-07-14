import type { Metadata } from "next";
import { InitialSetupForm } from "./setup-form";
import styles from "./setup.module.css";

export const metadata: Metadata = { title: "Configuración inicial" };

export default function InitialSetupPage() {
  return (
    <main>
      <section className={styles.intro}>
        <span>Asistente de configuración</span>
        <h1>Prepara la academia para comenzar.</h1>
        <p>
          Define los datos institucionales, canales de contacto y reglas
          operativas que utilizarán el sitio público, los correos y el checkout.
        </p>
      </section>
      <InitialSetupForm />
    </main>
  );
}
