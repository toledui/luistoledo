import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page/legal-page";
export const metadata: Metadata = { title: "Aviso de privacidad" };
const sections = [
  {
    title: "Responsable del tratamiento",
    paragraphs: [
      "Luis Toledo Academy, operada por Luis Toledo y THagencia, es responsable del uso y protección de los datos personales recabados a través de esta plataforma. Para cualquier asunto relacionado con privacidad puedes escribir a contacto@luistoledo.com.mx o utilizar el formulario de contacto.",
    ],
  },
  {
    title: "Datos personales que recopilamos",
    paragraphs: [
      "Recopilamos únicamente la información necesaria para operar la academia, procesar compras, proporcionar acceso a los cursos y atender solicitudes.",
    ],
    items: [
      "Datos de identificación y contacto, como nombre, correo electrónico y teléfono.",
      "Información de cuenta, preferencias, sesiones y seguridad.",
      "Información académica, inscripciones, avance, evaluaciones y certificados.",
      "Información de pedidos y pagos. Los datos completos de tarjeta son procesados por Stripe y no se almacenan en nuestros servidores.",
      "Datos técnicos, como dirección IP, navegador, registros de actividad y controles anti-spam.",
    ],
  },
  {
    title: "Finalidades",
    items: [
      "Crear y administrar cuentas de usuario.",
      "Procesar pedidos, pagos, transferencias, cupones y devoluciones aplicables.",
      "Dar acceso a cursos, registrar progreso y emitir certificados.",
      "Enviar confirmaciones, avisos operativos, recuperación de acceso y comunicaciones solicitadas.",
      "Atender solicitudes de contacto y soporte.",
      "Prevenir fraude, abuso, accesos no autorizados y proteger la plataforma.",
      "Cumplir obligaciones legales, fiscales y de protección al consumidor.",
    ],
  },
  {
    title: "Cookies y tecnologías",
    paragraphs: [
      "Utilizamos cookies necesarias para mantener sesiones, seguridad, carrito y preferencias. También usamos servicios como Stripe para pagos y Cloudflare Turnstile para prevenir envíos automatizados. Puedes aceptar o rechazar de forma independiente las cookies de analítica y publicidad mediante el control ‘Privacidad y cookies’ del sitio, y cambiar tu elección posteriormente.",
      "Si aceptas la analítica, registramos identificadores de navegador y sesión, páginas visitadas, eventos, referente disponible y parámetros de campaña para conocer la procedencia y los resultados del sitio. Podemos utilizar Google Analytics 4 y Google Tag Manager. Las direcciones IP se conservan cifradas por un máximo configurable de 30 días (7 días por defecto), con acceso restringido; las sesiones y eventos se conservan 90 días por defecto, hasta el límite configurado de 365 días.",
      "Si aceptas la publicidad, compartimos eventos de navegación y conversiones con Meta mediante Meta Pixel y Conversions API, y habilitamos las señales publicitarias configuradas de Google. Esto puede incluir identificadores publicitarios, un identificador seudónimo, información de navegador y datos de la compra. No enviamos contraseñas, datos de tarjeta ni mensajes de formularios a estas herramientas. Los proveedores pueden procesar la información fuera de México conforme a sus condiciones.",
      "La procedencia se identifica cuando el navegador o la campaña la proporciona. No conocemos las preguntas escritas en asistentes de IA ni vinculamos consultas orgánicas de Google con visitantes individuales. Al retirar el consentimiento dejamos de recopilar y enviar nuevos eventos de la categoría correspondiente; puedes solicitar la eliminación de registros anteriores mediante los medios de contacto indicados en este aviso.",
    ],
  },
  {
    title: "Transferencias y encargados",
    paragraphs: [
      "Utilizamos Sendcorex para gestionar contactos inscritos en cursos y masterclasses, y para el boletín cuando seleccionas esa opción en el formulario de contacto. Compartimos nombre, correo, teléfono disponible y etiquetas de procedencia; no enviamos el contenido de tu mensaje. Puedes desmarcar la casilla del boletín antes de enviar el formulario y darte de baja mediante el enlace de los correos o nuestros medios de contacto. La inscripción académica no se registra como aceptación del boletín.",
      "Podemos compartir datos limitados con proveedores que procesan información por nuestra cuenta, como alojamiento, correo transaccional, pagos y seguridad. Estos proveedores reciben sólo la información necesaria para prestar su servicio. No vendemos datos personales.",
    ],
  },
  {
    title: "Conservación y seguridad",
    paragraphs: [
      "Conservamos los datos durante el tiempo necesario para prestar el servicio, mantener registros académicos y cumplir obligaciones legales. Aplicamos medidas administrativas, técnicas y organizativas razonables, incluyendo cifrado de secretos, controles de acceso y registro de operaciones.",
    ],
  },
  {
    title: "Derechos ARCO y revocación",
    paragraphs: [
      "Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos, así como revocar tu consentimiento cuando legalmente proceda. Envía tu solicitud a contacto@luistoledo.com.mx indicando tu nombre, correo asociado, derecho que deseas ejercer y la información necesaria para identificar tu cuenta. Responderemos conforme a los plazos legalmente aplicables.",
    ],
  },
  {
    title: "Cambios al aviso",
    paragraphs: [
      "Podemos actualizar este aviso cuando cambien nuestros servicios o las disposiciones aplicables. La versión vigente estará siempre disponible en esta página e indicará su fecha de actualización.",
    ],
  },
];
export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacidad y datos personales"
      title="Aviso de privacidad"
      summary="Conoce qué información recopilamos, para qué la utilizamos y cómo puedes ejercer tus derechos sobre tus datos personales."
      sections={sections}
    />
  );
}
