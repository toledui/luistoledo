import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  type LegalSection,
} from "@/components/legal-page/legal-page";
import { CookiePreferences } from "@/components/analytics/cookie-preferences";
import { getSiteMetadata } from "@/lib/site-metadata";
import { privacy } from "@/lib/privacy";
import styles from "./cookies.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await getSiteMetadata({
      path: privacy.cookiesPath,
      title: "Política de cookies",
      description:
        "Conoce las cookies, el almacenamiento del navegador y las categorías de analítica y publicidad de Luis Toledo Academy. Cambia tus preferencias.",
    })),
    alternates: {
      canonical: `https://luistoledo.com.mx${privacy.cookiesPath}`,
    },
  };
}
const inventory = [
  [
    "lt_access / lt_refresh",
    "Cookies propias necesarias",
    "Mantener la autenticación. Sus nombres pueden personalizarse en el servidor.",
    "15 minutos / 7 días, respectivamente; pueden renovarse al usar la cuenta.",
  ],
  [
    "lta_cart_v1",
    "localStorage propio necesario",
    "Conservar el carrito del navegador.",
    "Sin caducidad automática; hasta que la aplicación lo actualice o borres el almacenamiento.",
  ],
  [
    "lta_consent_v1",
    "localStorage propio necesario",
    "Recordar categorías, versión y fecha de tu elección.",
    "La elección se considera válida por hasta 180 días; puede volver a solicitarse si cambia la versión.",
  ],
  [
    "lta_visitor_v1",
    "localStorage propio opcional",
    "Identificador seudónimo para la medición propia cuando aceptas analítica o publicidad.",
    "Hasta borrar el almacenamiento o retirar ambas categorías opcionales desde el control de preferencias.",
  ],
  [
    "lta_analytics_session_v1",
    "sessionStorage propio opcional",
    "Relacionar los eventos de una sesión según las categorías aceptadas.",
    "Se renueva tras 30 minutos de inactividad; el almacenamiento de sesión se elimina normalmente al cerrar la pestaña.",
  ],
  [
    "_ga y variantes",
    "Google, analítica",
    "Medir visitas y relacionar identificadores de Google Analytics cuando lo aceptas.",
    "La vigencia depende de la configuración de Google y de las restricciones del navegador.",
  ],
  [
    "_fbp / _fbc y posibles _gcl_*",
    "Meta / Google, publicidad",
    "Identificar el navegador o una campaña y medir conversiones cuando aceptas publicidad.",
    "La vigencia depende del proveedor, de la configuración activa y del navegador.",
  ],
  [
    "Cookies o almacenamiento de servicios externos",
    "Seguridad, pagos y contenido",
    "Stripe, Turnstile o reproductores externos pueden utilizar identificadores al usar sus servicios.",
    "Según el servicio que se cargue y su propia política; no todos se activan en todas las páginas.",
  ],
];
const sections: LegalSection[] = [
  {
    title: "Qué son y quién las utiliza",
    paragraphs: [
      `${privacy.responsible}, responsable de luistoledo.com.mx, utiliza cookies y tecnologías similares para operar la academia. Una cookie es un archivo que el navegador puede enviar al servidor. localStorage y sessionStorage guardan información en el navegador; no son cookies, pero también se describen aquí por su función.`,
      "La configuración y los proveedores activos determinan qué identificadores aparecen. Este documento describe la integración del sitio y no sustituye las políticas de los servicios externos que decidas utilizar.",
    ],
    content: (
      <p>
        <Link href={privacy.path}>
          Consulta el aviso integral de privacidad
        </Link>
        .
      </p>
    ),
  },
  {
    title: "Categorías y decisiones",
    items: [
      "Necesarias: acceso a la cuenta, seguridad, carrito y recuerdo de tus preferencias. No incluyen la analítica propia ni las etiquetas opcionales de Google o Meta.",
      "Analítica: eventos, páginas visitadas, procedencia y resultados para entender el uso de la academia, mediante medición propia y Google Analytics cuando esté configurado.",
      "Publicidad: eventos y conversiones para Meta Pixel / Conversions API y señales publicitarias de Google, según las herramientas activas y tu elección.",
    ],
    paragraphs: [
      "En el selector nuevo, analítica y publicidad comienzan desmarcadas. Puedes aceptar todas, guardar una combinación o elegir solo las necesarias. La simple navegación no se interpreta como aceptación de las categorías opcionales. La configuración publicitaria personal en una red social no sustituye la elección realizada en esta web.",
    ],
  },
  {
    title: "Preferencias de cookies",
    content: (
      <div id="preferencias">
        <CookiePreferences />
      </div>
    ),
    paragraphs: [
      "Tu elección se guarda por navegador y dispositivo. Al borrar el almacenamiento, cambiar de navegador o caducar la decisión, puede solicitarse nuevamente. Puedes encontrar esta página y sus controles en el pie del sitio; no es necesario un botón flotante.",
    ],
  },
  {
    title: "Inventario de identificadores y duración",
    paragraphs: [
      "Los siguientes nombres corresponden al código de la plataforma y a identificadores habituales de las integraciones configurables. La lista no significa que todos estén presentes. Los proveedores pueden modificar nombres y vigencias; las herramientas de privacidad del navegador permiten inspeccionar los identificadores realmente guardados.",
    ],
    content: (
      <div className={styles.table}>
        <table>
          <caption>Identificadores del navegador y su finalidad</caption>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo y categoría</th>
              <th>Finalidad</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(([name, type, purpose, duration]) => (
              <tr key={name}>
                <th scope="row">{name}</th>
                <td>{type}</td>
                <td>{purpose}</td>
                <td>{duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    title: "Qué información se mide",
    paragraphs: [
      "Cuando aceptas las categorías correspondientes, la integración registra eventos como visita de página, vista de curso, carrito, inicio de pago, compra confirmada, formulario, registro o clic de WhatsApp. Puede asociar identificadores de sesión, origen o campaña y, para operaciones comerciales, cursos, moneda, importe e identificador de transacción. Los eventos del navegador y del servidor pueden compartir un identificador para evitar contar dos veces la misma acción.",
      "La analítica propia puede conservar IP cifrada y datos del navegador bajo acceso restringido. Identificamos un referente o una palabra clave solamente si el navegador, una campaña o una fuente habilitada lo proporciona. No leemos conversaciones privadas con ChatGPT, Gemini u otros asistentes. No incluimos mensajes de formularios, contraseñas ni números completos de tarjeta en los eventos publicitarios.",
    ],
  },
  {
    title: "Retirar consentimiento y borrar identificadores",
    paragraphs: [
      "Elegir solo necesarias retira las dos categorías opcionales en este navegador. El sitio actualiza sus señales de consentimiento, revoca la sesión de medición propia que corresponda e intenta borrar los identificadores opcionales accesibles de Google y Meta. Los scripts que ya se cargaron pueden permanecer en la página; si quieres interrumpir esas conexiones, recarga después de guardar la elección.",
      "No podemos borrar desde esta web cookies de otros dominios ni eliminar retroactivamente información ya recibida por terceros. Puedes borrar cookies y almacenamiento desde los ajustes del navegador y solicitar el ejercicio de tus derechos según el aviso de privacidad. Bloquear las necesarias puede impedir el acceso, los pagos o la conservación del carrito. La baja del newsletter se realiza por separado.",
    ],
  },
  {
    title: "Servicios externos y contenido incorporado",
    paragraphs: [
      "Stripe y Cloudflare Turnstile intervienen al realizar pagos o comprobar formularios. Un reproductor de YouTube o Vimeo incorporado puede conectarse a su proveedor al cargar la página, y un enlace de WhatsApp te lleva a ese servicio al abrirlo. Estas conexiones pueden transmitir IP e información técnica aunque no aceptes la medición de Google o Meta del sitio. El selector controla nuestras categorías de analítica y publicidad, no los ajustes de otras aplicaciones o todos los identificadores técnicos de servicios externos.",
      "Google Tag Manager gestiona las etiquetas configuradas. Su uso no implica que se carguen todos los servicios de Google ni autoriza etiquetas adicionales fuera de tus preferencias. La activación de las herramientas depende también de la configuración del administrador.",
    ],
  },
  {
    title: "Información adicional y cambios",
    paragraphs: [
      `Para consultas sobre estas tecnologías escribe a ${privacy.email}. El aviso de privacidad contiene los datos del responsable, su domicilio y el procedimiento de derechos ARCO. Los cambios a esta política se publicarán en esta página con su fecha. Si cambia una versión relevante del consentimiento, solicitaremos una nueva elección.`,
    ],
    content: (
      <p>
        <Link href={privacy.path}>Aviso de privacidad</Link> ·{" "}
        <Link href="/contacto">Contacto</Link>
      </p>
    ),
  },
];
export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Cookies y preferencias"
      title="Política de cookies"
      summary="Conoce cómo utilizamos cookies y almacenamiento del navegador, y decide si quieres activar la analítica y la publicidad."
      sections={sections}
      updatedAt={privacy.updatedAt}
    />
  );
}
