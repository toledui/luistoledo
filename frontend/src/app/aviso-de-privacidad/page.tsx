import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalPage,
  type LegalSection,
} from "@/components/legal-page/legal-page";
import { getSiteMetadata } from "@/lib/site-metadata";
import { privacy } from "@/lib/privacy";

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await getSiteMetadata({
      path: privacy.path,
      title: "Aviso de privacidad",
      description:
        "Aviso integral de privacidad de Luis Toledo Academy: datos personales, cursos, eventos, pagos, newsletter, analítica, publicidad y derechos ARCO.",
    })),
    alternates: { canonical: `https://luistoledo.com.mx${privacy.path}` },
  };
}

const sections: LegalSection[] = [
  {
    title: "Responsable y medios de contacto",
    paragraphs: [
      `${privacy.responsible}, quien opera el sitio luistoledo.com.mx bajo los nombres comerciales Luis Toledo Academy y THagencia, es responsable del tratamiento de los datos personales descritos en este aviso.`,
      `Domicilio para asuntos de datos personales: ${privacy.address}. Para consultas, derechos ARCO, oposición a publicidad o revocación del consentimiento escribe a ${privacy.email}, con el asunto “Privacidad y datos personales”.`,
    ],
  },
  {
    title: "Datos que obtenemos y su procedencia",
    paragraphs: [
      "Obtenemos datos cuando creas una cuenta, compras, te inscribes a un curso o masterclass, utilizas el aula, envías un formulario o solicitas recibir comunicaciones. También podemos incorporar directorios proporcionados por el responsable o sus colaboradores autorizados. Un dato importado no implica por sí mismo autorización para cualquier comunicación comercial.",
    ],
    items: [
      "Identificación y contacto: nombre, apellidos, correo, teléfono y WhatsApp. Cuando completas tu perfil: fecha de nacimiento, país, estado, ciudad, código postal, empresa, cargo y biografía.",
      "Cuenta y seguridad: contraseña protegida mediante hash, sesiones, verificaciones, recuperación de acceso, roles, permisos y registros de actividad. No almacenamos contraseñas en texto legible.",
      "Actividad académica: cursos inscritos, lecciones, progreso, evaluaciones, respuestas, intentos, calificaciones y certificados. La verificación pública de un certificado puede mostrar el nombre del titular, el curso y su validez a quien tenga el enlace o código.",
      "Información comercial: carrito, pedidos, cursos adquiridos, precios, moneda, descuentos, pagos, transferencias, referencias e identificadores de transacción, planes de pago y cuotas. Stripe procesa los datos completos de la tarjeta; la plataforma no guarda el número completo ni el código de seguridad.",
      "Contacto y eventos: asunto, mensaje, fecha de solicitud, inscripción, preferencia de newsletter y consentimiento registrado. Conservamos información del envío y del resultado de la sincronización de contactos.",
      "Datos técnicos: IP, navegador, agente de usuario, páginas, eventos, fechas, identificadores de sesión y visitante, referente y parámetros de campaña disponibles. La procedencia puede identificar Google, ChatGPT, Gemini u otros sitios cuando el navegador o una campaña la comunica. No obtenemos tus conversaciones privadas ni podemos conocer una palabra clave que no haya sido proporcionada.",
    ],
  },
  {
    title: "Usos necesarios para prestar el servicio",
    items: [
      "Administrar cuentas, autenticar accesos, verificar correos y recuperar credenciales.",
      "Gestionar compras, pagos y cuotas; validar transferencias, atender aclaraciones y cumplir las obligaciones aplicables a esas operaciones.",
      "Proporcionar acceso al aula, materiales, evaluaciones, seguimiento académico y certificados.",
      "Registrar tu participación en eventos, cursos y masterclasses; enviar confirmaciones, enlaces, recordatorios y avisos relacionados con esa participación.",
      "Atender mensajes, soporte, solicitudes de privacidad y comunicaciones que hayas solicitado.",
      "Proteger cuentas y formularios, prevenir fraude y abuso, mantener registros operativos y atender requerimientos válidos de autoridades.",
    ],
    paragraphs: [
      "Los campos obligatorios se identifican en cada formulario. Si no proporcionas los datos indispensables, puede no ser posible completar la operación correspondiente. Los datos opcionales del perfil y la preferencia del boletín no son requisito para atender un mensaje.",
    ],
  },
  {
    title: "Newsletter, publicidad y usos opcionales",
    paragraphs: [
      "Las comunicaciones comerciales incluyen novedades, contenidos, ofertas y promoción de cursos o eventos. Puedes rechazar estos usos sin perder el acceso al servicio contratado. En el formulario de contacto, la casilla del boletín aparece marcada inicialmente y puedes desmarcarla antes de enviar. Conservamos la elección y la fecha correspondiente. Inscribirte a un curso o masterclass no equivale a aceptar el boletín general.",
      "Puedes solicitar la baja en el enlace que acompañe las comunicaciones comerciales o escribiendo a nuestro correo de privacidad. Las confirmaciones de compra, seguridad y participación solicitadas pueden continuar mientras sean necesarias para prestar el servicio. No cambies el consentimiento de cookies para darte de baja del boletín: son preferencias distintas.",
      "La analítica y publicidad del navegador se activan según las categorías que aceptes. Utilizamos resultados de navegación y conversiones para comprender el uso del sitio, evaluar campañas y, cuando corresponda y hayas aceptado publicidad, facilitar medición y segmentación publicitaria a través de Google y Meta. Puedes cambiar estas preferencias en la página de cookies.",
    ],
  },
  {
    title: "Sendcorex y directorios importados",
    paragraphs: [
      "Cuando está activa la integración, Sendcorex recibe los datos necesarios para gestionar los contactos inscritos a cursos y masterclasses, los contactos que eligieron el boletín y los directorios importados. Compartimos nombre, apellidos disponibles, correo, teléfono disponible y etiquetas de origen; no se envía el texto del formulario de contacto, información de pago ni contraseñas.",
      "Los contactos se actualizan por correo para evitar duplicados. La sincronización manual puede incorporar históricos o volver a enviar datos previamente confirmados. El importador CSV y su vista previa se utilizan desde el panel por personal autorizado. La importación al directorio no crea una cuenta de alumno ni una inscripción, y no se marca automáticamente como aceptación del newsletter. Debe respetarse la procedencia y el permiso de uso del directorio.",
      "La integración conserva los estados de baja y supresión existentes en Sendcorex y no fuerza su reactivación. Si tu contacto proviene de un directorio y no reconoces la relación o no deseas comunicaciones, solicita información sobre su procedencia, oposición o cancelación por los medios indicados en este aviso.",
    ],
  },
  {
    title: "Proveedores, destinatarios y tratamiento internacional",
    items: [
      "Stripe: procesamiento de pagos y prevención de fraude en las operaciones realizadas con ese proveedor.",
      "Sendcorex y el proveedor de correo configurado: gestión de contactos y entrega de comunicaciones correspondientes a las finalidades descritas.",
      "Cloudflare Turnstile, cuando está activado: comprobaciones técnicas de seguridad para reducir envíos automatizados; recibe el token de verificación y datos técnicos necesarios, incluida la IP cuando se envía para verificar el formulario.",
      "Google Analytics 4 y Google Tag Manager, cuando se aceptan las categorías correspondientes: medición y gestión de etiquetas. Meta Pixel y Conversions API, con consentimiento de publicidad: eventos de navegación y conversión, identificadores del navegador o seudónimos, agente de usuario y datos de la operación medidos. Las herramientas se usan según la configuración activa; Tag Manager no autoriza finalidades adicionales por sí mismo.",
      "WhatsApp / Meta: si decides abrir un enlace o unirte al grupo de una masterclass, utilizarás ese servicio conforme a sus condiciones. Otros miembros del grupo pueden ver tu número, nombre, foto y lo que compartas, según las funciones y tus ajustes de WhatsApp. La inscripción en la web no te incorpora automáticamente al grupo.",
      "YouTube, Vimeo u otros servicios de contenido enlazados o incorporados: al cargar un reproductor o visitar sus sitios, estos pueden recibir IP, datos del dispositivo e información sobre la reproducción bajo sus propias políticas. El acceso a un enlace externo no se realiza en nombre del usuario de forma automática.",
      "Autoridades y terceros legitimados: información necesaria para cumplir una obligación, resolver una controversia o atender un requerimiento válido, dentro del alcance permitido.",
    ],
    paragraphs: [
      "Utilizamos proveedores de alojamiento, base de datos, copias de seguridad, correo y herramientas de operación para prestar el servicio. El personal con acceso al panel actúa según sus permisos. Los proveedores pueden tratar información fuera de México, conforme a los servicios contratados, sus condiciones y las obligaciones aplicables. No vendemos tu directorio de datos personales.",
      "Distinguimos los proveedores que procesan datos por nuestra cuenta de los terceros que deciden sus propios usos, como ciertos servicios de pagos, redes sociales o enlaces externos. Cuando una comunicación de datos requiera autorización, la recabaremos antes de realizarla; puedes rechazar publicidad y su medición desde las preferencias de cookies.",
    ],
  },
  {
    title: "Cookies, almacenamiento local y analítica",
    paragraphs: [
      "Las tecnologías necesarias permiten iniciar sesión, proteger el acceso, mantener el carrito y recordar decisiones de privacidad. La analítica propia y de Google, así como los eventos publicitarios de Meta, dependen de tus preferencias. El selector inicial permite aceptar todas, guardar categorías o utilizar solo las necesarias. Ninguna categoría opcional está preseleccionada en el selector nuevo.",
      "En la analítica propia, la IP se conserva cifrada con acceso restringido, por 7 días de forma predeterminada y hasta 30 días según configuración. Las sesiones y eventos se conservan 90 días de forma predeterminada, con un máximo configurable de 365 días. La depuración se ejecuta periódicamente en el servidor. Estos plazos no describen los registros de seguridad, pedidos o formularios ni la conservación que apliquen terceros por separado.",
      "Al retirar una categoría, dejamos de registrar nuevos eventos de esa categoría mediante nuestra integración y actualizamos las señales de consentimiento. La retirada no elimina automáticamente datos que ya hayan recibido terceros: puedes solicitar su atención por los medios de este aviso y ejercer tus derechos ante el proveedor cuando corresponda.",
    ],
    content: (
      <p>
        <Link href={privacy.cookiesPath}>
          Consulta la política de cookies y cambia tus preferencias
        </Link>
        .
      </p>
    ),
  },
  {
    title: "Conservación, seguridad y eliminación",
    paragraphs: [
      "Conservamos datos de cuenta, historial académico y certificados mientras sean necesarios para prestar y acreditar el servicio; pedidos y pagos durante los periodos exigibles para obligaciones y controversias; y mensajes, directorios y comunicaciones mientras subsista la finalidad o proceda atender una solicitud de supresión. La cola de sincronización conserva datos de contacto y estado de entrega. Al completar una importación CSV se elimina su copia temporal de filas, pero permanecen el directorio y los registros de sincronización.",
      "Aplicamos medidas como control de acceso, hash de contraseñas, cifrado de credenciales de proveedores y de IP en analítica, y registro de operaciones administrativas. Ningún sistema es infalible. Los respaldos pueden mantener copias durante su ciclo de conservación; una solicitud de eliminación puede estar sujeta al bloqueo, las obligaciones aplicables y la atención coordinada con proveedores. Si se identifica una vulneración que afecte de forma significativa tus derechos, se informará conforme corresponda.",
    ],
  },
  {
    title: "Derechos ARCO, revocación y límites de uso",
    paragraphs: [
      `Para acceder, rectificar, cancelar u oponerte al uso de tus datos, limitar comunicaciones o revocar una autorización, escribe a ${privacy.email}. Incluye tu nombre, medio para recibir respuesta, derecho solicitado y datos que permitan localizar el registro. Para rectificar, indica la corrección y su sustento. Verificaremos la identidad y, en su caso, la representación mediante un canal acordado; no envíes documentos sensibles en formularios públicos.`,
      "Para solicitudes ARCO completas y acreditadas, comunicaremos la determinación en hasta 20 días hábiles y, si procede, la haremos efectiva dentro de los 15 días hábiles siguientes; podrán ampliarse una vez en los supuestos aplicables. La revocación no tiene efectos retroactivos y puede limitar servicios que necesiten esos datos. Una obligación de conservación puede impedir la eliminación inmediata. Puedes acudir a la Secretaría Anticorrupción y Buen Gobierno conforme al procedimiento aplicable si consideras vulnerados tus derechos.",
    ],
  },
  {
    title: "Datos sensibles, menores y decisiones automatizadas",
    paragraphs: [
      "No solicitamos datos sensibles como información de salud, religión, opiniones políticas o biométricos para registrarte o comprar. Evita incluirlos en mensajes, biografías y archivos. Si un servicio llegara a requerirlos, se informará su finalidad y se obtendrá la autorización que corresponda.",
      "La plataforma está dirigida a personas con capacidad para contratar. Si un menor utiliza un servicio, su madre, padre o representante deberá gestionar las autorizaciones necesarias. Si detectas datos de un menor recabados sin autorización, contáctanos para revisar su tratamiento.",
      "Las evaluaciones del aula pueden calcular resultados automáticamente con base en las respuestas y reglas del curso. Los controles de acceso y seguridad también pueden realizar comprobaciones automáticas. Puedes solicitar revisión de una incidencia mediante soporte. La procedencia atribuida a un asistente de IA no significa que leamos tus conversaciones ni que enviemos tus mensajes de contacto a esos asistentes.",
    ],
  },
  {
    title: "Vigencia y cambios al aviso",
    paragraphs: [
      "La versión vigente se publica en https://luistoledo.com.mx/aviso-de-privacidad con su fecha de actualización. Si cambian de forma relevante las finalidades o los destinatarios, se informará por este sitio o los medios de contacto disponibles y se recabará una nueva autorización cuando corresponda. Revisa también la política de cookies y las condiciones del servicio.",
    ],
    content: (
      <p>
        <Link href={privacy.cookiesPath}>Política de cookies</Link> ·{" "}
        <Link href="/terminos">Términos y condiciones</Link> ·{" "}
        <Link href="/contacto">Contacto</Link>
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacidad y datos personales"
      title="Aviso de privacidad"
      summary="Conoce los datos que tratamos al utilizar la academia, comprar, inscribirte a eventos, recibir comunicaciones y navegar por el sitio, así como las opciones para decidir sobre su uso."
      sections={sections}
      updatedAt={privacy.updatedAt}
    />
  );
}
