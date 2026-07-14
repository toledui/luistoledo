import {
  AlertTriangle,
  BookOpen,
  CircleDollarSign,
  MailCheck,
  Settings2,
  Users,
} from "lucide-react";
import Link from "next/link";
import styles from "./dashboard.module.css";

const metrics = [
  {
    label: "Cursos publicados",
    value: "0",
    icon: BookOpen,
    note: "Crea tu primer curso",
  },
  {
    label: "Alumnos activos",
    value: "0",
    icon: Users,
    note: "Sin alumnos registrados",
  },
  {
    label: "Ingresos del mes",
    value: "$0",
    icon: CircleDollarSign,
    note: "MXN",
  },
  {
    label: "Correos enviados",
    value: "0",
    icon: MailCheck,
    note: "SMTP pendiente",
  },
];

export default function AdminDashboard() {
  return (
    <main className={styles.dashboard}>
      <div className={styles.heading}>
        <div>
          <span>Resumen general</span>
          <h1>Todo listo para construir la academia.</h1>
          <p>Este panel crecerá con cursos, alumnos, ventas y progreso real.</p>
        </div>
        <Link href="/admin/configuracion/inicial">
          <Settings2 size={17} />
          Continuar configuración
        </Link>
      </div>
      <section className={styles.metrics}>
        {metrics.map(({ label, value, icon: Icon, note }) => (
          <article key={label}>
            <div>
              <Icon size={20} />
            </div>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <section className={styles.grid}>
        <article className={styles.activity}>
          <div className={styles.cardHeading}>
            <div>
              <span>Actividad reciente</span>
              <h2>Primeros pasos</h2>
            </div>
          </div>
          <ol>
            <li className={styles.done}>
              <span>1</span>
              <div>
                <strong>Base técnica inicial</strong>
                <small>Frontend, backend y MySQL conectados.</small>
              </div>
            </li>
            <li className={styles.done}>
              <span>2</span>
              <div>
                <strong>Superadministrador</strong>
                <small>Autenticación y permisos funcionando.</small>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Completar branding</strong>
                <small>Logotipos, colores y contenido público.</small>
              </div>
            </li>
            <li>
              <span>4</span>
              <div>
                <strong>Configurar correo</strong>
                <small>SMTP, plantillas y correo de prueba.</small>
              </div>
            </li>
          </ol>
        </article>
        <aside className={styles.alerts}>
          <div className={styles.cardHeading}>
            <div>
              <span>Estado del sistema</span>
              <h2>Configuración pendiente</h2>
            </div>
            <AlertTriangle size={20} />
          </div>
          <ul>
            <li>
              <span />
              SMTP no configurado
            </li>
            <li>
              <span />
              Proveedor de pagos no configurado
            </li>
            <li>
              <span />
              Políticas legales pendientes
            </li>
            <li>
              <span />
              Primer curso pendiente
            </li>
          </ul>
          <Link href="/admin/configuracion/inicial">
            Resolver configuración
          </Link>
        </aside>
      </section>
    </main>
  );
}
