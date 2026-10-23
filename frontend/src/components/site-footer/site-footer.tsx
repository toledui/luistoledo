import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { CurrencyAttribution } from "@/components/currency/currency-context";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container"><CurrencyAttribution /></div>
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link className="brand footer-logo" href="/" aria-label="Ir al inicio">
            <span className="brand-mark brand-mark-logo">
              <BrandLogo dark />
            </span>
            <span className="brand-copy">
              <strong>Luis Toledo</strong>
              <small>Academy</small>
            </span>
          </Link>
          <p>
            Formación práctica en desarrollo web, marketing digital y ventas
            B2B, respaldada por la experiencia de THagencia.
          </p>
        </div>

        <div>
          <h3>Explorar</h3>
          <Link href="/cursos">Cursos</Link>
          <Link href="/eventos">Eventos</Link>
          <Link href="/#metodo">Metodología</Link>
          <Link href="/#sobre-mi">Sobre Luis</Link>
        </div>

        <div>
          <h3>Recursos</h3>
          <Link href="/blog">Blog</Link>
          <span>Guías gratuitas</span>
          <Link href="/#faq">Preguntas frecuentes</Link>
        </div>

        <div>
          <h3>Contacto</h3>
          <span>THagencia</span>
          <Link href="/contacto">Soporte</Link>
          <span>LinkedIn</span>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© 2026 Luis Toledo · THagencia. Todos los derechos reservados.</span>
        <div>
          <Link href="/aviso-de-privacidad">Aviso de privacidad</Link>
          <Link href="/politica-de-cookies">Política de cookies</Link>
          <Link href="/politica-de-cookies#preferencias">Preferencias de cookies</Link>
          <Link href="/terminos">Términos</Link>
        </div>
      </div>
    </footer>
  );
}
