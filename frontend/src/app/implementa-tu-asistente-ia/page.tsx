import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Laptop,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Countdown } from "./countdown";
import { Pricing } from "./pricing";
import styles from "./paid-course.module.css";

export const metadata: Metadata = {
  title: "Implementa tu Propio Asistente de IA 24/7 · Luis Toledo",
  description:
    "Construye y conecta tu asistente de IA en tres sábados de implementación en vivo. 21 y 28 de noviembre y 5 de diciembre de 2026. 9:00 a 13:00, hora CDMX.",
  robots: { index: false, follow: false },
};
const sessions = [
  {
    number: "01",
    date: "21 NOV",
    title: "Construye y personaliza tu asistente",
    subtitle: "De una idea a tu primera conversación desde el celular.",
    result:
      "Tu propio agente configurado, con acceso protegido y primeras tareas verificadas.",
    topics: [
      ["9:00–9:30", "Qué es un agente y qué necesita para trabajar"],
      ["9:30–10:30", "Instalación guiada de Hermes Agent"],
      ["10:30–11:15", "Proveedor de IA, personalidad e instrucciones"],
      ["11:15–11:30", "Descanso"],
      ["11:30–12:15", "Conexión con Telegram y protección del acceso"],
      ["12:15–13:00", "Memoria, archivos y primeras tareas desde tu celular"],
    ],
  },
  {
    number: "02",
    date: "28 NOV",
    title: "Conéctalo con tus herramientas de trabajo",
    subtitle: "Agenda, documentos e información que sí puedes comprobar.",
    result:
      "Conexiones probadas con Calendar y una carpeta de Drive; un documento de prueba y resultados desde Telegram.",
    topics: [
      ["9:00–9:30", "Permisos y conexiones con Google Workspace"],
      ["9:30–10:30", "Calendar: consultar la agenda y proponer eventos"],
      ["10:30–11:15", "Drive: buscar y organizar en una carpeta designada"],
      ["11:15–11:30", "Descanso"],
      ["11:30–12:15", "Resúmenes, documentos y reportes con fuentes"],
      ["12:15–13:00", "Investigación web y entrega de resultados"],
    ],
  },
  {
    number: "03",
    date: "05 DIC",
    title: "Automatiza y pon tu asistente a trabajar",
    subtitle: "Un flujo real para tu negocio, con controles y mantenimiento.",
    result:
      "Al menos una automatización funcional, un flujo empresarial probado y un plan de operación continua.",
    topics: [
      ["9:00–9:45", "Tareas programadas e informes recurrentes"],
      ["9:45–10:30", "Borradores para WordPress con una conexión preparada"],
      ["10:30–11:15", "Instrucciones especializadas para investigación y SEO"],
      ["11:15–11:30", "Descanso"],
      ["11:30–12:15", "Operación continua: servidor, costos y permisos"],
      ["12:15–13:00", "Pruebas, revisión de errores y proyecto final"],
    ],
  },
];
export default function PaidCoursePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Image
          src="/images/asistente-ia/luis-asistente.png"
          alt="Luis Toledo con un asistente de inteligencia artificial en su celular"
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>
            <Sparkles size={16} />
            IMPLEMENTACIÓN EN VIVO · NOV–DIC 2026
          </span>
          <h1>
            Implementa tu propio <em>asistente de IA 24/7.</em>
          </h1>
          <p>
            Deja de imaginar lo que la IA podría hacer por tu negocio.
            Configura, conecta y prueba tu propio asistente, paso a paso con
            Luis Toledo.
          </p>
          <div className={styles.heroFacts}>
            <span>
              <CalendarDays size={18} />
              Iniciamos el 21 de noviembre
            </span>
            <span>
              <Clock3 size={18} />3 sábados · 12 horas en vivo
            </span>
            <span>
              <Laptop size={18} />
              9:00 a 13:00 · Hora CDMX
            </span>
          </div>
          <a href="#inscripcion" className={styles.primary}>
            Quiero implementar mi asistente <ArrowUpRight size={21} />
          </a>
          <small>
            En línea · Instalación guiada · Aplicación en tu negocio
          </small>
        </div>
        <span className={styles.instructor}>
          Tu instructor <strong>Luis Toledo</strong>
        </span>
      </section>
      <div className={styles.container}>
        <Countdown />
      </div>
      <section className={`${styles.container} ${styles.intro}`}>
        <span className={styles.eyebrow}>
          NO SOLO VAS A ESCUCHAR. VAS A IMPLEMENTAR.
        </span>
        <h2>
          Un asistente al que puedas escribirle <em>desde tu celular.</em>
        </h2>
        <p>
          Que recuerde las instrucciones de tu negocio, trabaje con la
          información que autorices y te ayude a preparar tareas mientras tú
          atiendes lo importante.
        </p>
        <div className={styles.outcomes}>
          {[
            [
              MessageCircle,
              "Tu punto de partida",
              "Conversa con tu agente desde Telegram y dale instrucciones con contexto de tu negocio.",
            ],
            [
              Laptop,
              "Tus herramientas conectadas",
              "Aprende a consultar tu agenda, trabajar con documentos y entregar información verificable.",
            ],
            [
              ShieldCheck,
              "Tu primera automatización",
              "Prueba un flujo empresarial con permisos definidos y aprende a mantenerlo funcionando.",
            ],
          ].map(([Icon, title, text]) => {
            const FeatureIcon = Icon as typeof MessageCircle;
            return (
              <article key={String(title)}>
                <FeatureIcon size={26} />
                <h3>{String(title)}</h3>
                <p>{String(text)}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section className={styles.story}>
        <div className={styles.container}>
          <div className={styles.storyImage}>
            <Image
              src="/images/asistente-ia/implementacion.png"
              alt="Ilustración de un asistente conectado entre una computadora y un celular"
              width={1536}
              height={1024}
              sizes="(max-width: 800px) 100vw, 55vw"
            />
          </div>
          <div>
            <span className={styles.eyebrow}>APRENDE HACIENDO</span>
            <h2>
              Tu negocio tiene contexto.
              <br />
              <em>Tu asistente también debe tenerlo.</em>
            </h2>
            <p>
              Configuraremos las instrucciones, la memoria y las herramientas de
              tu agente para trabajar sobre tareas concretas. Empezamos con
              accesos de prueba y verificamos los resultados antes de ampliar
              sus permisos.
            </p>
            <ul className={styles.checklist}>
              <li>
                <Check />
                Instalación y configuración guiadas
              </li>
              <li>
                <Check />
                Ejercicios aplicados a tu trabajo
              </li>
              <li>
                <Check />
                Pruebas de conexión y revisión de errores
              </li>
              <li>
                <Check />
                Controles para acciones sensibles
              </li>
            </ul>
          </div>
        </div>
      </section>
      <section
        className={`${styles.container} ${styles.curriculum}`}
        id="programa"
      >
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>EL CAMINO DE IMPLEMENTACIÓN</span>
            <h2>
              Tres sábados.
              <br />
              <em>Un asistente que ya puedes usar.</em>
            </h2>
          </div>
          <p>
            21 y 28 de noviembre · 5 de diciembre de 2026
            <br />
            De 9:00 a 13:00, hora de Ciudad de México.
          </p>
        </div>
        {sessions.map((session) => (
          <details
            key={session.number}
            className={styles.session}
            open={session.number === "01"}
          >
            <summary>
              <span className={styles.sessionNumber}>{session.number}</span>
              <div>
                <span className={styles.sessionDate}>
                  SÁBADO {session.date} · 2026
                </span>
                <h3>{session.title}</h3>
                <p>{session.subtitle}</p>
              </div>
              <span className={styles.expand}>+</span>
            </summary>
            <div className={styles.sessionBody}>
              <div>
                {session.topics.map(([time, topic]) => (
                  <div key={time} className={styles.agenda}>
                    <time>{time}</time>
                    <span>{topic}</span>
                  </div>
                ))}
              </div>
              <aside>
                <Check size={25} />
                <strong>Al terminar esta sesión</strong>
                <p>{session.result}</p>
              </aside>
            </div>
          </details>
        ))}
      </section>
      <section className={styles.tools}>
        <div className={styles.container}>
          <div>
            <span className={styles.eyebrow}>CONECTADO CON TU TRABAJO</span>
            <h2>
              Menos copiar y pegar.
              <br />
              <em>Más tareas resueltas.</em>
            </h2>
            <p>
              Exploraremos Google Calendar, una carpeta de Drive, documentos,
              investigación web y borradores para WordPress. Las conexiones se
              autorizan y prueban contigo.
            </p>
            <p>
              Si no tienes un sitio web, podrás realizar la práctica de
              WordPress sobre un entorno de demostración.
            </p>
            <div className={styles.toolTags}>
              <span>Hermes Agent</span>
              <span>Telegram</span>
              <span>Calendar</span>
              <span>Drive y Docs</span>
              <span>WordPress</span>
            </div>
          </div>
          <Image
            src="/images/asistente-ia/herramientas.png"
            alt="Ilustración de un asistente de IA con calendario, documentos y herramientas empresariales"
            width={1536}
            height={1024}
            sizes="(max-width: 800px) 100vw, 50vw"
          />
        </div>
      </section>
      <section className={`${styles.container} ${styles.includes}`}>
        <span className={styles.eyebrow}>QUÉ INCLUYE TU INSCRIPCIÓN</span>
        <h2>
          Aprende, prueba
          <br />
          <em>y vuelve a consultarlo.</em>
        </h2>
        <div>
          {[
            "Tres sesiones de implementación en vivo",
            "Grabaciones de las sesiones",
            "Guías y materiales de configuración",
            "Ejemplos de instrucciones para tu agente",
            "Prácticas de conexión y automatización",
            "Grupo de WhatsApp para el curso",
          ].map((item) => (
            <p key={item}>
              <Check size={20} />
              {item}
            </p>
          ))}
        </div>
        <aside>
          <strong>Lo que necesitas para participar</strong>
          <p>
            Una computadora, conexión estable a internet, cuenta de Google y
            Telegram. Sigue las instrucciones previas para preparar tus accesos.
            Para mantener el asistente activo se necesita un equipo encendido o
            un servidor; el alojamiento, consumo de IA y servicios de terceros
            tienen costos independientes del curso.
          </p>
        </aside>
      </section>
      <section
        className={`${styles.container} ${styles.registration}`}
        id="inscripcion"
      >
        <span className={styles.eyebrow}>ELIGE CÓMO COMENZAR</span>
        <h2>
          Invierte en un asistente.
          <br />
          <em>Aprende a hacerlo tuyo.</em>
        </h2>
        <p>El mismo programa de implementación. Dos formas de inscribirte.</p>
        <Pricing />
      </section>
      <section className={`${styles.container} ${styles.faq}`}>
        <span className={styles.eyebrow}>ANTES DE DAR EL SIGUIENTE PASO</span>
        <h2>Resolvamos tus dudas.</h2>
        {[
          [
            "¿Necesito saber programar?",
            "La instalación es guiada. Necesitas una computadora y disposición para configurar cuentas, permisos y herramientas. Te compartiremos indicaciones de preparación antes del inicio.",
          ],
          [
            "¿Cómo funcionan las parcialidades?",
            "Pagas $500 para apartar tu lugar. Cuando confirmamos ese pago se activa tu inscripción y aparecen dos órdenes de $990 en tu cuenta, con vencimiento el 21 y el 28 de noviembre de 2026. Tú realizas cada pago; no hay cargos automáticos. El total es $2,480 MXN.",
          ],
          [
            "¿Qué pasa después de pagar?",
            "Al confirmar tu inscripción recibirás un correo con el grupo de WhatsApp y la información del curso. Si pagas por transferencia, el correo se envía cuando el equipo valida el depósito.",
          ],
          [
            "¿El precio incluye servidor y consumo de IA?",
            "No. El curso cubre la formación y los materiales. El proveedor de IA, el alojamiento y algunos servicios conectados pueden generar cargos independientes. Para operar de forma continua necesitas infraestructura activa y mantenimiento.",
          ],
          [
            "¿Mi asistente podrá administrar todo mi negocio?",
            "Construiremos y probaremos un conjunto concreto de funciones. Las capacidades dependerán de las herramientas conectadas, sus permisos y la configuración. Las acciones sensibles requieren controles y supervisión.",
          ],
          [
            "¿Cuándo terminan las inscripciones?",
            "El 18 de noviembre de 2026 a las 23:59, hora de Ciudad de México. La primera sesión es el sábado 21 de noviembre de 9:00 a 13:00.",
          ],
        ].map(([question, answer]) => (
          <details key={question}>
            <summary>
              {question}
              <span>+</span>
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
      <section className={styles.finalCta}>
        <span className={styles.eyebrow}>
          DEL “ALGÚN DÍA” A TU PRIMER AGENTE
        </span>
        <h2>
          Este noviembre,
          <br />
          <em>pon manos a la IA.</em>
        </h2>
        <a href="#inscripcion" className={styles.primary}>
          Ver opciones de inscripción <ArrowUpRight size={21} />
        </a>
        <p>21 y 28 de noviembre · 5 de diciembre · 9:00 a 13:00 CDMX</p>
      </section>
    </main>
  );
}
