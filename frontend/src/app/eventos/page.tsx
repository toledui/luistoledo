import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Video } from "lucide-react";
import { masterclass } from "@/lib/masterclass";
import { getSiteMetadata } from "@/lib/site-metadata";
import styles from "./events.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata({
    path: "/eventos",
    title: "Eventos y masterclasses gratuitas",
    description:
      "Descubre los eventos de Luis Toledo Academy. Inscríbete a la masterclass gratuita de inteligencia artificial para dueños de negocios, en vivo y en línea.",
  });
}

export default function EventsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>
            <CalendarDays size={18} /> APRENDE EN VIVO
          </span>
          <h1>
            Eventos que te acercan
            <br />a tu siguiente paso.
          </h1>
          <p>
            Masterclasses y encuentros para aprender con ejemplos reales,
            resolver dudas y llevar nuevas ideas a tu negocio.
          </p>
        </div>
      </section>
      <section
        className={`${styles.container} ${styles.agenda}`}
        aria-labelledby="events-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>NUESTRA AGENDA</span>
            <h2 id="events-heading">Eventos y masterclasses</h2>
          </div>
          <span>En línea · Con Luis Toledo</span>
        </div>
        <article className={styles.event}>
          <div className={styles.visual}>
            <CalendarDays size={44} strokeWidth={1.4} aria-hidden="true" />
            <span>MASTERCLASS EN VIVO</span>
            <strong>
              IA para
              <br />
              tu negocio.
            </strong>
            <p>Ideas prácticas. Ejemplos reales.</p>
            <span className={styles.free}>Acceso gratuito</span>
          </div>
          <div className={styles.content}>
            <span className={styles.eyebrow}>MASTERCLASS GRATUITA</span>
            <h3>
              <Link href={masterclass.path}>{masterclass.title}</Link>
            </h3>
            <p>
              Aprende a crear contenido que venda, atender mejor a tus clientes
              y ahorrar tiempo con inteligencia artificial. Una sesión práctica,
              sin experiencia previa en IA.
            </p>
            <ul className={styles.details}>
              <li>
                <CalendarDays size={18} aria-hidden="true" />
                <span>
                  <time dateTime={masterclass.startsAt}>
                    {masterclass.date} · {masterclass.time}
                  </time>
                  <small>Hora de {masterclass.timezone}</small>
                </span>
              </li>
              <li>
                <Clock3 size={18} aria-hidden="true" />
                <span>{masterclass.duration}</span>
              </li>
              <li>
                <Video size={18} aria-hidden="true" />
                <span>100% en línea · En vivo</span>
              </li>
            </ul>
            <Link className={styles.cta} href={masterclass.path}>
              Ver masterclass e inscribirme gratis{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
