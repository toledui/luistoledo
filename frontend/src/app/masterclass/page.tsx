import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  MessageCircle,
  TrendingUp,
  ChartNoAxesCombined,
} from "lucide-react";
import { masterclass } from "@/lib/masterclass";
import { MasterclassForm } from "./registration-form";
import styles from "./masterclass.module.css";

export const metadata: Metadata = {
  title: "IA para dueños de negocios · Masterclass gratuita · 29 de octubre",
  description:
    "Aprende a usar la inteligencia artificial para crear contenido que venda, atender mejor a tus clientes y ahorrar tiempo. Gratis y en vivo con Luis Toledo. 29 de octubre, 8:00 p. m., hora de Ciudad de México.",
  openGraph: {
    title: "Aprende a usar la IA para ahorrar tiempo y vender mejor",
    description:
      "Masterclass gratuita para dueños de negocios con Luis Toledo · 29 de octubre · 8:00 p. m., Ciudad de México.",
  },
};

const lessons = [
  {
    icon: TrendingUp,
    title: "Crea contenido que te ayude a vender",
    text: "Aprende a preparar publicaciones, promociones y mensajes de venta con IA para comunicar mejor lo que ofreces y dejar de perder tiempo pensando qué publicar.",
  },
  {
    icon: MessageCircle,
    title: "Atiende mejor y da seguimiento a tus clientes",
    text: "Aprende a redactar respuestas a preguntas frecuentes, mensajes de seguimiento y propuestas para mantener la conversación con las personas interesadas en tu negocio.",
  },
  {
    icon: Clock3,
    title: "Ahorra tiempo en el trabajo de todos los días",
    text: "Aprende a usar la IA para redactar correos, resumir información y organizar pendientes, para dedicar menos horas al trabajo repetitivo y más a tus clientes.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Toma decisiones con información más clara",
    text: "Aprende a ordenar información de ventas y gastos, comparar opciones y hacer mejores preguntas para entender qué necesita atención en tu negocio.",
  },
];
const problems = [
  {
    title: "Quieres usar la IA, pero no sabes por dónde empezar",
    text: "Escuchas hablar de ella todos los días, pero necesitas saber para qué te sirve en un negocio como el tuyo.",
  },
  {
    title: "El día se te va contestando, redactando y organizando",
    text: "Entre mensajes, correos y pendientes, queda poco tiempo para atender clientes y hacer crecer tu negocio.",
  },
  {
    title: "Necesitas vender, pero crear contenido te toma demasiado tiempo",
    text: "Sabes que debes publicar y dar seguimiento. Lo difícil es encontrar qué decir y hacer espacio para hacerlo.",
  },
];

export default function MasterclassPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.intro}>
          <span className={styles.kicker}>MASTERCLASS GRATUITA · EN VIVO</span>
          <p className={styles.audience}>
            Inteligencia artificial para dueños de negocios
          </p>
          <h1>
            Aprende a usar la IA para{" "}
            <span>ahorrar tiempo y vender mejor.</span>
          </h1>
          <p className={styles.lead}>
            Crea contenido para tu negocio, responde mejor a tus clientes y
            quítate de encima trabajo repetitivo. Aprende por dónde empezar en
            una sesión de 90 minutos, sin experiencia previa en IA.
          </p>
          <div className={styles.date}>
            <CalendarDays size={22} />
            <div>
              <strong>
                {masterclass.date} · {masterclass.time}
              </strong>
              <span>
                Hora de {masterclass.timezone} · {masterclass.duration} · 100%
                en línea
              </span>
            </div>
          </div>
          <ul className={styles.checks}>
            <li>
              <Check /> Aprende qué decir para promocionar lo que vendes
            </li>
            <li>
              <Check /> Dedica menos tiempo a correos, mensajes y pendientes
            </li>
            <li>
              <Check /> Llévate ideas para aplicar en tu propio negocio
            </li>
          </ul>
          <div className={styles.host}>
            <Image
              src="/images/luistoledofoto.jpg"
              alt="Luis Toledo"
              width={64}
              height={64}
            />
            <div>
              <strong>Aprende con Luis Toledo</strong>
              <span>
                Fundador de THagencia.
                <br />
                Más de 10 años trabajando con empresas y emprendedores.
              </span>
            </div>
          </div>
        </div>
        <div id="registro" className={styles.formAnchor}>
          <MasterclassForm />
        </div>
      </section>
      <section className={styles.problems}>
        <div className={styles.heading}>
          <span className={styles.kicker}>¿TE PASA EN TU NEGOCIO?</span>
          <h2>Trabajas todo el día y todavía quedan pendientes.</h2>
          <p>
            Aprende cómo la IA puede ayudarte con el trabajo que hoy te consume
            tiempo.
          </p>
        </div>
        <div className={styles.problemGrid}>
          {problems.map((problem, index) => (
            <article key={problem.title}>
              <span>0{index + 1}</span>
              <h3>{problem.title}</h3>
              <p>{problem.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.results}>
        <div className={styles.heading}>
          <span className={styles.kicker}>LO QUE VAS A APRENDER</span>
          <h2>Menos trabajo repetitivo. Más tiempo para tu negocio.</h2>
          <p>
            Cuatro formas de aprovechar la inteligencia artificial en lo que
            haces todos los días.
          </p>
        </div>
        <div className={styles.resultGrid}>
          {lessons.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon size={28} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className={styles.benefitCta}>
          <Link href="#registro" className="btn btn-primary btn-large">
            Quiero aprender a usar la IA en mi negocio <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      <section className={styles.agenda}>
        <div>
          <span className={styles.kicker}>UNA SESIÓN PENSADA PARA TI</span>
          <h2>No necesitas saber de IA para empezar a aprovecharla.</h2>
          <p>
            Si tienes un negocio, vendes un servicio o trabajas por tu cuenta,
            esta masterclass te ayudará a encontrar maneras de hacer tu trabajo
            más fácil.
          </p>
          <Link href="#registro" className="btn btn-primary">
            Reservar mi lugar gratis <ArrowRight size={18} />
          </Link>
        </div>
        <ol>
          <li>
            <strong>90 minutos, directo a lo que te sirve</strong>
            <p>
              Contenido enfocado en ventas, clientes y tareas de tu negocio,
              explicado con palabras sencillas.
            </p>
          </li>
          <li>
            <strong>Aprende desde donde estés</strong>
            <p>
              La sesión es 100% en línea. Solo necesitas conexión a internet
              para acompañarnos.
            </p>
          </li>
          <li>
            <strong>Resuelve tus dudas en vivo</strong>
            <p>
              Podrás preguntar cómo aprovechar lo aprendido en tu trabajo y en
              tu negocio.
            </p>
          </li>
          <li>
            <strong>Entrada gratuita</strong>
            <p>
              Regístrate y entra al grupo de WhatsApp para recibir el enlace de
              acceso.
            </p>
          </li>
        </ol>
      </section>
      <section className={styles.faq}>
        <h2>Todo listo para que te sumes.</h2>
        <details>
          <summary>¿Para quién es esta masterclass?</summary>
          <p>
            Para dueños de negocios, emprendedores y profesionistas que quieren
            ahorrar tiempo, mejorar su comunicación con clientes y aprovechar la
            IA en su trabajo diario.
          </p>
        </details>
        <details>
          <summary>¿Necesito experiencia en inteligencia artificial?</summary>
          <p>
            No. Aprenderás con explicaciones sencillas y situaciones que ya
            conoces de tu negocio: publicar, responder clientes, preparar
            mensajes y organizar tu trabajo.
          </p>
        </details>
        <details>
          <summary>¿Qué voy a aprender en estos 90 minutos?</summary>
          <p>
            Aprenderás a usar la IA para preparar contenido y mensajes de venta,
            responder preguntas de clientes, organizar pendientes y resumir
            información. Te llevarás ideas concretas para elegir por dónde
            empezar en tu negocio.
          </p>
        </details>
        <details>
          <summary>
            ¿Me sirve si tengo un negocio pequeño o trabajo por mi cuenta?
          </summary>
          <p>
            Sí. La sesión está pensada para quienes se encargan de vender,
            atender clientes y organizar el trabajo de cada día. Aprenderás a
            apoyarte en la IA para dedicar menos tiempo a esas tareas, aunque no
            tengas un equipo que te ayude.
          </p>
        </details>
        <details>
          <summary>¿Qué aprenderé para promocionar mejor lo que vendo?</summary>
          <p>
            Cómo convertir lo que sabes de tu producto o servicio en ideas de
            publicaciones, promociones y mensajes más claros. También aprenderás
            a pedirle a la IA textos que respondan a las dudas de tus clientes y
            expliquen por qué elegir tu negocio.
          </p>
        </details>
        <details>
          <summary>
            ¿Cómo me ayudará a atender y dar seguimiento a mis clientes?
          </summary>
          <p>
            Aprenderás a preparar respuestas a preguntas frecuentes, redactar
            propuestas y escribir mensajes para retomar una conversación con
            alguien interesado. Así podrás responder con mayor claridad y
            aprovechar mejor el tiempo que dedicas a cada cliente.
          </p>
        </details>
        <details>
          <summary>¿En qué tareas puedo aprender a ahorrar tiempo?</summary>
          <p>
            En redactar correos, preparar contenido, resumir documentos y
            ordenar tus pendientes. Aprenderás a explicar lo que necesitas para
            obtener una primera versión que puedas revisar y adaptar a tu
            negocio, en lugar de empezar desde cero cada vez.
          </p>
        </details>
        <details>
          <summary>¿Qué necesito para aprovechar la sesión?</summary>
          <p>
            Una conexión a internet y tu celular o computadora. Trae una tarea
            que te quite tiempo o una duda de tu negocio: te ayudará a
            relacionar lo que aprendas con algo que necesitas resolver. Podrás
            hacer preguntas durante la sesión en vivo.
          </p>
        </details>
        <details>
          <summary>¿Es gratuita?</summary>
          <p>
            Sí. Tu participación es completamente gratuita. Solo registra tu
            nombre, correo y WhatsApp para reservar tu lugar.
          </p>
        </details>
        <details>
          <summary>¿Cuándo es y cómo entro?</summary>
          <p>
            El {masterclass.date} a las {masterclass.time}, hora de Ciudad de
            México. Al registrarte podrás entrar al grupo de WhatsApp, donde
            compartiremos el enlace de la sesión.
          </p>
        </details>
        <div className={styles.benefitCta}>
          <Link href="#registro" className="btn btn-primary btn-large">
            Reservar mi lugar gratis <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
