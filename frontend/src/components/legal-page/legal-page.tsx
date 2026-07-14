import { PublicNavbar } from "@/components/public-navbar/public-navbar";
import { Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import styles from "./legal-page.module.css";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export function LegalPage({
  eyebrow,
  title,
  summary,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <PublicNavbar />
      <main className={styles.page}>
        <header>
          <span>
            <ShieldCheck />
            {eyebrow}
          </span>
          <h1>{title}</h1>
          <p>{summary}</p>
          <small>Última actualización: 13 de julio de 2026</small>
        </header>
        <div className={styles.layout}>
          <aside>
            <strong>Contenido</strong>
            <nav>
              {sections.map((section, index) => (
                <a href={`#seccion-${index + 1}`} key={section.title}>
                  {index + 1}. {section.title}
                </a>
              ))}
            </nav>
            <div>
              <Mail />
              <p>¿Tienes alguna duda?</p>
              <Link href="/contacto">Contactar soporte</Link>
            </div>
          </aside>
          <article>
            {sections.map((section, index) => (
              <section id={`seccion-${index + 1}`} key={section.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{section.title}</h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.items && (
                    <ul>
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>
      <footer className={styles.footer}>
        <span>© 2026 Luis Toledo Academy · THagencia</span>
        <div>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/terminos">Términos</Link>
        </div>
      </footer>
    </>
  );
}
