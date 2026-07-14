"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  Code2,
  GraduationCap,
  Menu,
  MousePointerClick,
  Play,
  Rocket,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { AccountMenu } from "./account-menu/account-menu";
import { CartButton } from "./cart/cart-context";
import { BrandLogo } from "./brand-logo";
import { PublicNavbar } from "./public-navbar/public-navbar";
import { apiFetch } from "../lib/api";
import Image from "next/image";

const processSteps = [
  {
    number: "01",
    title: "Aprende el fundamento",
    text: "Clases claras y estructuradas para comprender el porqué antes de ejecutar.",
  },
  {
    number: "02",
    title: "Construye un proyecto",
    text: "Cada módulo aterriza en ejercicios, plantillas o implementaciones reales.",
  },
  {
    number: "03",
    title: "Aplica en tu negocio",
    text: "Transforma el conocimiento en un portafolio, un sistema o una fuente de ingresos.",
  },
];

const outcomes = [
  {
    icon: Rocket,
    title: "Aprendizaje aplicable",
    text: "Sin teoría de relleno. Cada clase está conectada con una tarea concreta.",
  },
  {
    icon: Target,
    title: "Rutas con objetivo",
    text: "Sabes qué aprender, en qué orden y qué resultado debes alcanzar.",
  },
  {
    icon: Users,
    title: "Experiencia de agencia",
    text: "Metodologías nacidas de proyectos, clientes y retos reales de negocio.",
  },
  {
    icon: Zap,
    title: "Contenido actualizado",
    text: "Tecnologías, canales y procesos alineados con el entorno digital actual.",
  },
];

const faqs = [
  {
    question: "¿Necesito experiencia previa para comenzar?",
    answer:
      "No necesariamente. Cada ruta parte de una base clara y avanza por niveles. En cada curso se especifican los conocimientos recomendados.",
  },
  {
    question: "¿Los cursos son únicamente para desarrolladores?",
    answer:
      "No. La plataforma integra desarrollo web, marketing digital y ventas B2B para freelancers, emprendedores, equipos comerciales y profesionales digitales.",
  },
  {
    question: "¿Voy a trabajar con proyectos reales?",
    answer:
      "Sí. El enfoque de la plataforma es práctico: construir, medir y aplicar. Cada ruta incluye ejercicios, recursos y proyectos de implementación.",
  },
  {
    question: "¿Puedo tomar las rutas por separado?",
    answer:
      "Sí. Puedes comenzar por la habilidad que más necesitas y posteriormente complementar tu perfil con las demás rutas.",
  },
];

function App() {
  const router = useRouter();
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    window.addEventListener("resize", closeMenu);
    return () => window.removeEventListener("resize", closeMenu);
  }, []);

  useEffect(() => {
    apiFetch("/courses?limit=12")
      .then(setFeaturedCourses)
      .catch(() => setFeaturedCourses([]));
  }, []);

  const goTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="site-shell">
      <PublicNavbar />
      {false && (
        <header className="site-header">
          <div className="container nav-wrap">
            <button
              className="brand"
              onClick={() => goTo("inicio")}
              aria-label="Ir al inicio"
            >
              <span className="brand-mark brand-mark-logo">
                <BrandLogo dark />
              </span>
              <span className="brand-copy">
                <strong>Luis Toledo</strong>
                <small>Academy</small>
              </span>
            </button>

            <nav className="desktop-nav" aria-label="Navegación principal">
              <button onClick={() => router.push("/cursos")}>Cursos</button>
              <button onClick={() => goTo("metodo")}>Metodología</button>
              <button onClick={() => goTo("sobre-mi")}>Sobre mí</button>
              <button onClick={() => goTo("faq")}>Preguntas</button>
            </nav>

            <div className="nav-actions">
              <CartButton />
              <AccountMenu />
            </div>

            <button
              className="menu-button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {menuOpen && (
            <div className="mobile-menu">
              <CartButton />
              <button onClick={() => router.push("/cursos")}>Cursos</button>
              <button onClick={() => goTo("metodo")}>Metodología</button>
              <button onClick={() => goTo("sobre-mi")}>Sobre mí</button>
              <button onClick={() => goTo("faq")}>Preguntas</button>
              <AccountMenu mobile />
            </div>
          )}
        </header>
      )}

      <main>
        <section className="hero section" id="inicio">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow-pill">
                <Sparkles size={16} />
                Aprende habilidades que generan resultados
              </div>

              <h1>
                Convierte tu experiencia digital en
                <span> proyectos, clientes y crecimiento.</span>
              </h1>

              <p className="hero-description">
                Cursos prácticos de desarrollo web, marketing digital y ventas
                B2B creados por Luis Toledo, desarrollador full stack y fundador
                de THagencia.
              </p>

              <div className="hero-actions">
                <button
                  className="btn btn-primary btn-large"
                  onClick={() => goTo("rutas")}
                >
                  Ver cursos destacados
                  <ArrowRight size={19} />
                </button>
                <button className="btn btn-secondary btn-large">
                  <span className="play-icon">
                    <Play size={16} fill="currentColor" />
                  </span>
                  Conoce la metodología
                </button>
              </div>

              <div className="hero-proof">
                <div>
                  <strong>10+</strong>
                  <span>Años desarrollando soluciones digitales</span>
                </div>
                <div>
                  <strong>12</strong>
                  <span>Cursos recientes para seguir aprendiendo</span>
                </div>
                <div>
                  <strong>100%</strong>
                  <span>Enfoque práctico y orientado a resultados</span>
                </div>
              </div>
            </div>

            <div
              className="hero-visual"
              aria-label="Vista de la plataforma educativa"
            >
              <div className="dashboard-card">
                <div className="dashboard-topbar">
                  <div className="window-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="live-badge">
                    <span />
                    Nueva ruta disponible
                  </span>
                </div>

                <div className="dashboard-body">
                  <div className="profile-row">
                    <div className="profile-avatar">LT</div>
                    <div>
                      <small>Tu instructor</small>
                      <strong>Luis Toledo</strong>
                    </div>
                    <div className="profile-chip">Full Stack</div>
                  </div>

                  <div className="lesson-card lesson-card-main">
                    <div className="lesson-icon">
                      <Code2 size={24} />
                    </div>
                    <div className="lesson-copy">
                      <small>Ruta recomendada</small>
                      <strong>Desarrollo Web Full Stack</strong>
                      <span>12 módulos · Proyecto final</span>
                    </div>
                    <button aria-label="Reproducir curso">
                      <Play size={18} fill="currentColor" />
                    </button>
                  </div>

                  <div className="progress-block">
                    <div className="progress-heading">
                      <span>Progreso de aprendizaje</span>
                      <strong>68%</strong>
                    </div>
                    <div className="progress-track">
                      <span />
                    </div>
                  </div>

                  <div className="mini-grid">
                    <article>
                      <div className="mini-icon violet">
                        <MousePointerClick size={19} />
                      </div>
                      <span>Marketing</span>
                      <strong>8 módulos</strong>
                    </article>
                    <article>
                      <div className="mini-icon lime">
                        <TrendingUp size={19} />
                      </div>
                      <span>Ventas B2B</span>
                      <strong>10 módulos</strong>
                    </article>
                  </div>
                </div>
              </div>

              <div className="floating-card floating-card-top">
                <div className="floating-icon">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <strong>Aprende haciendo</strong>
                  <span>Proyectos reales</span>
                </div>
              </div>

              <div className="floating-card floating-card-bottom">
                <div className="signal-bars">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div>
                  <strong>Avance constante</strong>
                  <span>Ruta paso a paso</span>
                </div>
              </div>
            </div>
          </div>

          <div className="container trusted-strip">
            <span>Experiencia aplicada en</span>
            <div className="trusted-items">
              <strong>WORDPRESS</strong>
              <strong>REACT</strong>
              <strong>WOOCOMMERCE</strong>
              <strong>SEO</strong>
              <strong>AUTOMATIZACIÓN</strong>
              <strong>VENTAS B2B</strong>
            </div>
          </div>
        </section>

        <section className="section section-light" id="rutas">
          <div className="container">
            <div className="section-heading center">
              <span className="section-kicker">Cursos destacados</span>
              <h2>Aprende con nuestros cursos más recientes.</h2>
              <p>
                Explora los últimos cursos publicados y elige la habilidad que
                quieres desarrollar a tu propio ritmo.
              </p>
            </div>

            <div className="course-grid">
              {featuredCourses.map((course, index) => {
                const price = Number(course.salePrice || course.price);
                return (
                  <article
                    className={`course-card course-${["cyan", "violet", "lime"][index % 3]}`}
                    key={course.id}
                  >
                    <button
                      className="course-cover"
                      onClick={() => router.push(`/cursos/${course.slug}`)}
                      aria-label={`Ver ${course.title}`}
                    >
                      {course.coverMedia?.url ? (
                        <Image
                          src={course.coverMedia.url}
                          alt={course.coverMedia.altText || course.title}
                          fill
                          quality={85}
                          sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1000px) 50vw, 380px"
                        />
                      ) : (
                        <GraduationCap size={42} />
                      )}
                    </button>
                    <div className="course-card-top">
                      <span>{course.category?.name || "Curso online"}</span>
                      {course.featured && <b>Destacado</b>}
                    </div>

                    <h3>{course.title}</h3>
                    <p>
                      {course.subtitle ||
                        course.shortDescription ||
                        "Una experiencia de aprendizaje práctica y diseñada para ayudarte a avanzar."}
                    </p>
                    <strong className="course-price">
                      {price === 0
                        ? "Gratis"
                        : `$${price.toLocaleString("es-MX")} MXN`}
                    </strong>

                    <button
                      className="course-link"
                      onClick={() => router.push(`/cursos/${course.slug}`)}
                    >
                      Ver curso
                      <ArrowRight size={17} />
                    </button>
                  </article>
                );
              })}
            </div>
            {!featuredCourses.length && (
              <div className="courses-empty">
                <GraduationCap size={34} />
                <p>Muy pronto publicaremos nuevos cursos.</p>
              </div>
            )}
          </div>
        </section>

        <section className="section method-section" id="metodo">
          <div className="container method-grid">
            <div className="method-copy">
              <span className="section-kicker section-kicker-dark">
                Metodología TH
              </span>
              <h2>No vienes a mirar clases. Vienes a construir resultados.</h2>
              <p>
                La metodología conecta conocimiento, práctica y aplicación para
                que cada módulo termine en una habilidad que puedas demostrar y
                utilizar.
              </p>

              <div className="method-badge">
                <div>
                  <Sparkles size={20} />
                </div>
                <span>
                  Creada a partir de más de una década desarrollando sitios,
                  campañas y procesos comerciales.
                </span>
              </div>
            </div>

            <div className="steps-list">
              {processSteps.map((step) => (
                <article className="step-card" key={step.number}>
                  <span className="step-number">{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                  <ArrowRight size={20} />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-light" id="sobre-mi">
          <div className="container about-grid">
            <div className="about-visual">
              <div className="portrait-frame">
                <div className="portrait-backdrop" />
                <div className="portrait-placeholder">
                  <span>LT</span>
                  <small>Fotografía de Luis Toledo</small>
                </div>
                <div className="experience-stamp">
                  <strong>10+</strong>
                  <span>años de experiencia</span>
                </div>
              </div>
            </div>

            <div className="about-copy">
              <span className="section-kicker">Tu instructor</span>
              <h2>Experiencia real detrás de cada lección.</h2>
              <p className="about-lead">
                Soy Luis Toledo, desarrollador web full stack y fundador de
                THagencia, una agencia especializada en desarrollo web,
                marketing digital y automatización.
              </p>
              <p>
                Durante más de 10 años he trabajado en proyectos para empresas,
                marcas y emprendedores. Ahora convierto esa experiencia en rutas
                claras para ayudarte a dominar habilidades digitales con
                contexto de negocio.
              </p>

              <div className="about-points">
                <div>
                  <Code2 size={20} />
                  <span>Desarrollo web y arquitectura de soluciones</span>
                </div>
                <div>
                  <Search size={20} />
                  <span>SEO, adquisición y crecimiento digital</span>
                </div>
                <div>
                  <BriefcaseBusiness size={20} />
                  <span>Procesos comerciales y venta consultiva B2B</span>
                </div>
              </div>

              <button className="btn btn-dark">
                Conocer mi trayectoria
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>

        <section className="section outcomes-section">
          <div className="container">
            <div className="section-heading center light-heading">
              <span className="section-kicker section-kicker-dark">
                Una plataforma para avanzar
              </span>
              <h2>
                Todo lo necesario para pasar de la intención a la ejecución.
              </h2>
            </div>

            <div className="outcomes-grid">
              {outcomes.map((outcome) => {
                const Icon = outcome.icon;
                return (
                  <article key={outcome.title}>
                    <div>
                      <Icon size={22} />
                    </div>
                    <h3>{outcome.title}</h3>
                    <p>{outcome.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section section-light" id="faq">
          <div className="container faq-grid">
            <div className="faq-intro">
              <span className="section-kicker">Preguntas frecuentes</span>
              <h2>Antes de comenzar, aclaremos lo importante.</h2>
              <p>
                La plataforma está diseñada para que puedas avanzar con
                claridad, sin importar si estás empezando o si ya trabajas en el
                mundo digital.
              </p>

              <div className="support-card">
                <div>
                  <Users size={22} />
                </div>
                <span>
                  <strong>¿Tienes otra pregunta?</strong>
                  Escríbenos y te ayudamos a elegir la mejor ruta.
                </span>
              </div>
            </div>

            <div className="faq-list">
              {faqs.map((faq, index) => {
                const open = activeFaq === index;
                return (
                  <article
                    className={`faq-item ${open ? "is-open" : ""}`}
                    key={faq.question}
                  >
                    <button onClick={() => setActiveFaq(open ? -1 : index)}>
                      <span>{faq.question}</span>
                      <ChevronDown size={20} />
                    </button>
                    <div className="faq-answer">
                      <p>{faq.answer}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section cta-section">
          <div className="container">
            <div className="cta-panel">
              <div className="cta-orb cta-orb-one" />
              <div className="cta-orb cta-orb-two" />
              <div className="cta-content">
                <span className="section-kicker section-kicker-dark">
                  Tu siguiente paso
                </span>
                <h2>
                  Empieza hoy a construir una habilidad que puedas convertir en
                  resultados.
                </h2>
                <p>
                  Explora las rutas, elige tu objetivo y comienza a desarrollar
                  un perfil digital más completo.
                </p>
                <div className="cta-actions">
                  <button
                    className="btn btn-primary btn-large"
                    onClick={() => router.push("/registro")}
                  >
                    Crear mi cuenta gratis
                    <ArrowRight size={19} />
                  </button>
                  <button
                    className="btn btn-ghost-light btn-large"
                    onClick={() => router.push("/mi-aprendizaje")}
                  >
                    Ir a mi aprendizaje
                  </button>
                </div>
              </div>

              <div className="cta-side-card">
                <span className="cta-side-label">TH Academy</span>
                <div className="cta-side-icon">
                  <GraduationCap size={34} />
                </div>
                <strong>Aprende. Construye. Vende.</strong>
                <small>Una visión integral del negocio digital.</small>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <button
              className="brand footer-logo"
              onClick={() => goTo("inicio")}
            >
              <span className="brand-mark brand-mark-logo">
                <BrandLogo dark />
              </span>
              <span className="brand-copy">
                <strong>Luis Toledo</strong>
                <small>Academy</small>
              </span>
            </button>
            <p>
              Formación práctica en desarrollo web, marketing digital y ventas
              B2B, respaldada por la experiencia de THagencia.
            </p>
          </div>

          <div>
            <h3>Explorar</h3>
            <button onClick={() => router.push("/cursos")}>Cursos</button>
            <button onClick={() => goTo("metodo")}>Metodología</button>
            <button onClick={() => goTo("sobre-mi")}>Sobre Luis</button>
          </div>

          <div>
            <h3>Recursos</h3>
            <button>Blog</button>
            <button>Guías gratuitas</button>
            <button>Preguntas frecuentes</button>
          </div>

          <div>
            <h3>Contacto</h3>
            <button>THagencia</button>
            <button>Soporte</button>
            <button>LinkedIn</button>
          </div>
        </div>

        <div className="container footer-bottom">
          <span>
            © 2026 Luis Toledo · THagencia. Todos los derechos reservados.
          </span>
          <div>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/terminos">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
