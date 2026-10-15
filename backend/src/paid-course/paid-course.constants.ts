export const PAID_COURSE = {
  program: 'asistente-ia',
  courseId: 'asistente-ia-noviembre-2026',
  slug: 'implementa-tu-asistente-ia',
  title: 'Implementa tu Propio Asistente de IA 24/7',
  timezone: 'America/Mexico_City',
  registrationClosesAt: '2026-11-18T23:59:59-06:00',
  sessions: [
    '2026-11-21T09:00:00-06:00',
    '2026-11-28T09:00:00-06:00',
    '2026-12-05T09:00:00-06:00',
  ],
  sessionHours: 4,
  cashPrice: 1790,
  regularPrice: 3224,
  deposit: 500,
  installmentAmount: 990,
  installmentTotal: 2480,
  installmentDueDates: [
    '2026-11-21T09:00:00-06:00',
    '2026-11-28T09:00:00-06:00',
  ],
} as const;

// This invitation is deliberately excluded from all public course responses.
export const PAID_COURSE_WHATSAPP =
  'https://chat.whatsapp.com/HOf0NtaT2gRFud7cbrmJMz';
