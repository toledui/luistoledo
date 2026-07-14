import { ConfigurationNav } from "./configuration-nav";
import styles from "./configuration-layout.module.css";
export default function ConfigurationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.configuration}>
      <header className={styles.header}>
        <div>
          <span>Administración</span>
          <h1>Configuración</h1>
          <p>
            Administra la identidad, comunicación y comportamiento de la
            academia.
          </p>
        </div>
      </header>
      <ConfigurationNav />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
