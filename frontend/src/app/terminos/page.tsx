import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page/legal-page";
export const metadata: Metadata = { title: "Términos y condiciones" };
const sections = [
  {
    title: "Aceptación y alcance",
    paragraphs: [
      "Estos términos regulan el acceso y uso de Luis Toledo Academy, así como la compra de cursos y servicios digitales. Al crear una cuenta, realizar una compra o utilizar la plataforma confirmas que leíste y aceptaste estas condiciones y el Aviso de Privacidad.",
    ],
  },
  {
    title: "Cuentas y seguridad",
    items: [
      "Debes proporcionar información verdadera, actualizada y mantener seguras tus credenciales.",
      "La cuenta es personal y no puede compartirse, venderse o transferirse.",
      "Debes notificarnos si detectas un acceso no autorizado.",
      "Podemos suspender temporalmente una cuenta cuando existan indicios razonables de fraude, abuso o incumplimiento, informando al usuario cuando sea procedente.",
    ],
  },
  {
    title: "Cursos y acceso",
    paragraphs: [
      "La descripción, precio, duración estimada, requisitos y alcance de cada curso se muestran antes de la compra. Salvo que la ficha indique otra vigencia, el acceso se mantiene mientras la plataforma y el curso continúen disponibles. Podemos actualizar materiales para mantenerlos vigentes sin reducir sustancialmente el contenido adquirido.",
    ],
    items: [
      "El progreso y los certificados dependen del cumplimiento de las actividades y criterios indicados.",
      "No se garantiza un resultado profesional, comercial o económico específico.",
      "El acceso permite uso personal y no incluye derechos para redistribuir el contenido.",
    ],
  },
  {
    title: "Precios, pagos y facturación",
    paragraphs: [
      "Los precios se muestran en pesos mexicanos y el total se informa antes de confirmar la compra. Los pagos con tarjeta son procesados por Stripe. Cuando esté habilitada, la transferencia bancaria requerirá validación manual y deberá realizarse dentro del plazo indicado.",
    ],
    items: [
      "Los cupones están sujetos a vigencia, mínimo de compra, cursos participantes y límites de uso.",
      "Una orden sólo se considera pagada cuando la plataforma confirma el pago.",
      "Para solicitar información de facturación utiliza el formulario de contacto con los datos del pedido.",
    ],
  },
  {
    title: "Cancelaciones y reembolsos",
    paragraphs: [
      "Las solicitudes de cancelación o reembolso se analizarán de acuerdo con la naturaleza digital del servicio, el acceso y consumo del contenido, las condiciones informadas al comprar y los derechos irrenunciables reconocidos por la legislación aplicable. Envía la solicitud desde Contacto incluyendo número de pedido y motivo. Nada en estos términos limita los derechos que legalmente correspondan a la persona consumidora.",
    ],
  },
  {
    title: "Uso permitido",
    items: [
      "No copiar, grabar, descargar, publicar o distribuir materiales salvo autorización expresa.",
      "No eludir controles de acceso, seguridad, evaluación o límites técnicos.",
      "No utilizar la plataforma para actividades ilícitas, fraudulentas o que afecten a terceros.",
      "No intentar acceder a cuentas, información o sistemas ajenos.",
    ],
  },
  {
    title: "Propiedad intelectual",
    paragraphs: [
      "Los cursos, videos, documentos, textos, diseños, marcas, software y demás materiales están protegidos por la legislación aplicable. La compra concede una licencia limitada, personal, no exclusiva y no transferible para fines de aprendizaje; no transfiere derechos de propiedad intelectual.",
    ],
  },
  {
    title: "Disponibilidad y responsabilidad",
    paragraphs: [
      "Trabajamos para mantener la plataforma disponible y segura, pero pueden existir interrupciones por mantenimiento, actualizaciones, proveedores externos o causas fuera de control razonable. Cuando sea posible informaremos incidencias relevantes y restauraremos el servicio. La responsabilidad se determinará conforme a la legislación aplicable y no se excluyen derechos que legalmente no puedan renunciarse.",
    ],
  },
  {
    title: "Contacto, cambios y legislación",
    paragraphs: [
      "Puedes enviar dudas, aclaraciones o inconformidades mediante la página de Contacto o al correo contacto@luistoledo.com.mx. Podemos actualizar estos términos para reflejar cambios del servicio o legales; la versión vigente mostrará su fecha de actualización. Estos términos se interpretan conforme a las leyes aplicables en México.",
    ],
  },
];
export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Condiciones del servicio"
      title="Términos y condiciones"
      summary="Reglas claras para utilizar la plataforma, adquirir cursos y conocer tus derechos y responsabilidades como usuario."
      sections={sections}
    />
  );
}
