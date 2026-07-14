export type DefaultEmailTemplate = {
  event: string;
  name: string;
  subject: string;
  preheader: string;
  htmlContent: string;
  textContent: string;
};

const paragraph = (text: string) =>
  `<p style="margin:0 0 22px;color:#526174;font-size:16px;line-height:1.7">${text}</p>`;
const button = (label: string, url: string) =>
  `<div style="margin:30px 0"><a href="${url}" target="_blank" style="display:inline-block;padding:15px 24px;background:#079bb9;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px">${label}</a></div>`;
const fallback = (url: string) =>
  `<p style="margin:24px 0 0;color:#7b899b;font-size:12px;line-height:1.6">Si el botón no funciona, copia y pega este enlace en tu navegador:<br><a href="${url}" target="_blank" style="color:#079bb9;word-break:break-all">${url}</a></p>`;
const shell = (eyebrow: string, title: string, body: string, note: string) =>
  `<div style="margin:0;padding:32px 16px;background:#f3f6f9;font-family:Arial,Helvetica,sans-serif;color:#172235"><table style="width:100%;max-width:640px;margin:0 auto;border-collapse:collapse;background:#ffffff;border-radius:18px;overflow:hidden"><tbody><tr><td style="padding:30px 36px;background:#07111f"><div style="color:#56dff7;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Luis Toledo</div><div style="margin-top:5px;color:#ffffff;font-size:22px;font-weight:700">Academy</div></td></tr><tr><td style="padding:42px 36px 18px"><div style="color:#079bb9;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">${eyebrow}</div><h1 style="margin:12px 0 18px;color:#07111f;font-size:30px;line-height:1.2">${title}</h1>${body}</td></tr><tr><td style="padding:10px 36px 38px"><div style="padding:18px 20px;background:#f1fbfd;border-radius:12px;color:#526174;font-size:13px;line-height:1.6">${note}</div></td></tr><tr><td style="padding:25px 36px;background:#07111f;color:#91a0b3;font-size:12px;line-height:1.6"><strong style="color:#ffffff">{{academy_name}}</strong><br>Formación práctica para crear, crecer y liderar.<br>¿Necesitas ayuda? <a href="mailto:{{support_email}}" style="color:#56dff7;text-decoration:none">{{support_email}}</a><br><span style="color:#64758a">© {{current_year}} {{academy_name}}. Todos los derechos reservados.</span></td></tr></tbody></table></div>`;

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    event: 'WELCOME',
    name: 'Bienvenida',
    subject: '¡Bienvenido a {{academy_name}}, {{student_name}}!',
    preheader: 'Tu espacio de aprendizaje ya está listo. Comienza hoy.',
    htmlContent: shell(
      'Tu aprendizaje comienza aquí',
      '¡Bienvenido, {{student_name}}!',
      paragraph(
        'Nos alegra tenerte en <strong>{{academy_name}}</strong>. Tu cuenta ya está activa y desde ahora tienes un espacio diseñado para aprender a tu ritmo, aplicar conocimientos y avanzar hacia tus objetivos.',
      ) +
        paragraph(
          'Explora tus cursos, retoma tus lecciones y consulta tu progreso desde tu panel de aprendizaje.',
        ) +
        button('Ir a mi aprendizaje', '{{course_url}}'),
      'Guarda este correo como referencia. Si tienes alguna pregunta, nuestro equipo está disponible en <strong>{{support_email}}</strong>.',
    ),
    textContent:
      '¡Bienvenido, {{student_name}}!\n\nTu cuenta en {{academy_name}} ya está activa. Explora tus cursos y consulta tu progreso aquí:\n{{course_url}}\n\n¿Necesitas ayuda? Escríbenos a {{support_email}}.\n\n© {{current_year}} {{academy_name}}.',
  },
  {
    event: 'VERIFY_EMAIL',
    name: 'Verificación de correo',
    subject: 'Confirma tu correo y activa tu cuenta en {{academy_name}}',
    preheader: 'Solo falta un paso para comenzar tu aprendizaje.',
    htmlContent: shell(
      'Confirma tu identidad',
      'Solo falta un paso, {{student_name}}',
      paragraph(
        'Gracias por registrarte en <strong>{{academy_name}}</strong>. Confirma que esta dirección de correo te pertenece para activar tu cuenta y proteger tu acceso.',
      ) +
        button('Confirmar mi correo', '{{verification_url}}') +
        fallback('{{verification_url}}'),
      'Por tu seguridad, este enlace es personal y tiene vigencia limitada. Si tú no creaste esta cuenta, puedes ignorar este mensaje.',
    ),
    textContent:
      'Hola, {{student_name}}.\n\nConfirma tu correo para activar tu cuenta en {{academy_name}}:\n{{verification_url}}\n\nEste enlace es personal y tiene vigencia limitada. Si no creaste esta cuenta, ignora este mensaje.\n\nSoporte: {{support_email}}',
  },
  {
    event: 'RESET_PASSWORD',
    name: 'Recuperación de contraseña',
    subject: 'Restablece tu contraseña de {{academy_name}}',
    preheader: 'Recibimos una solicitud para recuperar el acceso a tu cuenta.',
    htmlContent: shell(
      'Seguridad de tu cuenta',
      'Crea una nueva contraseña',
      paragraph(
        'Hola, <strong>{{student_name}}</strong>. Recibimos una solicitud para restablecer la contraseña asociada a <strong>{{student_email}}</strong>.',
      ) +
        paragraph(
          'Usa el siguiente botón para crear una contraseña nueva y recuperar el acceso a tu cuenta.',
        ) +
        button('Restablecer contraseña', '{{reset_password_url}}') +
        fallback('{{reset_password_url}}'),
      'Este enlace es de un solo uso y tiene vigencia limitada. Si no solicitaste el cambio, ignora este correo; tu contraseña actual seguirá siendo válida.',
    ),
    textContent:
      'Hola, {{student_name}}.\n\nRecibimos una solicitud para restablecer la contraseña de {{student_email}}. Crea una nueva aquí:\n{{reset_password_url}}\n\nEl enlace es de un solo uso y tiene vigencia limitada. Si no solicitaste el cambio, ignora este correo.\n\nSoporte: {{support_email}}',
  },
  {
    event: 'COURSE_COMPLETED',
    name: 'Curso completado',
    subject: '¡Felicidades, {{student_name}}! Completaste {{course_name}}',
    preheader: 'Tu dedicación dio resultado. Has concluido el curso.',
    htmlContent: shell(
      'Meta alcanzada',
      '¡Completaste {{course_name}}!',
      paragraph(
        'Felicidades, <strong>{{student_name}}</strong>. Has concluido todas las lecciones de <strong>{{course_name}}</strong>.',
      ) +
        paragraph(
          'Tu progreso quedó registrado y tu certificado ya está disponible en tu área de aprendizaje.',
        ) +
        button('Ver mi curso', '{{course_url}}'),
      'Sigue desarrollando tus habilidades. Cada curso terminado es una nueva herramienta para tus proyectos.',
    ),
    textContent:
      '¡Felicidades, {{student_name}}! Completaste {{course_name}} en {{academy_name}}. Consulta tu curso aquí: {{course_url}}',
  },
  {
    event: 'CERTIFICATE_GENERATED',
    name: 'Certificado generado',
    subject: 'Tu certificado de {{course_name}} está listo',
    preheader: 'Descarga tu certificado y comparte tu logro.',
    htmlContent: shell(
      'Certificado disponible',
      'Un logro que puedes compartir',
      paragraph(
        'Hola, <strong>{{student_name}}</strong>. Generamos tu certificado oficial por completar <strong>{{course_name}}</strong>.',
      ) +
        paragraph(
          'Encontrarás el PDF adjunto a este correo. También puedes descargarlo o verificar su autenticidad desde el siguiente enlace.',
        ) +
        button('Verificar certificado', '{{certificate_url}}') +
        fallback('{{certificate_url}}'),
      'El certificado incluye un folio y código de verificación únicos. Conserva este correo como respaldo de tu logro.',
    ),
    textContent:
      'Hola, {{student_name}}. Tu certificado de {{course_name}} está listo y se adjunta en PDF. Verifícalo aquí: {{certificate_url}}',
  },
  {
    event: 'ORDER_RECEIVED',
    name: 'Pedido recibido',
    subject: 'Recibimos tu pedido {{order_number}}',
    preheader: 'Tu pedido fue creado correctamente.',
    htmlContent: shell(
      'Pedido recibido',
      'Estamos procesando tu compra',
      paragraph(
        'Hola, <strong>{{student_name}}</strong>. Recibimos el pedido <strong>{{order_number}}</strong> por {{order_total}}.',
      ) + paragraph('Cursos: {{course_name}}'),
      'Te avisaremos en cuanto el pago quede confirmado.',
    ),
    textContent:
      'Hola {{student_name}}. Recibimos tu pedido {{order_number}} por {{order_total}}. Cursos: {{course_name}}.',
  },
  {
    event: 'PAYMENT_APPROVED',
    name: 'Pago aprobado',
    subject: 'Pago confirmado · {{order_number}}',
    preheader: 'Tu pago fue aprobado.',
    htmlContent: shell(
      'Pago confirmado',
      'Tu compra está lista',
      paragraph(
        'Confirmamos el pago del pedido <strong>{{order_number}}</strong> por {{order_total}}.',
      ) + button('Ir a mis cursos', '{{course_url}}'),
      'El acceso ya está activo en tu cuenta.',
    ),
    textContent:
      'Pago confirmado para {{order_number}}. Accede a tus cursos: {{course_url}}',
  },
  {
    event: 'COURSE_ENROLLED',
    name: 'Acceso al curso',
    subject: 'Ya tienes acceso a {{course_name}}',
    preheader: 'Comienza a aprender ahora.',
    htmlContent: shell(
      'Inscripción activa',
      'Tus cursos ya están disponibles',
      paragraph(
        'Hola, <strong>{{student_name}}</strong>. Ya puedes acceder a: {{course_name}}.',
      ) + button('Comenzar ahora', '{{course_url}}'),
      'Tu progreso se guardará automáticamente.',
    ),
    textContent:
      'Ya tienes acceso a {{course_name}}. Comienza aquí: {{course_url}}',
  },
];

export const DEFAULT_EMAIL_TEMPLATES_BY_EVENT = Object.fromEntries(
  DEFAULT_EMAIL_TEMPLATES.map(({ event, ...template }) => [event, template]),
);
