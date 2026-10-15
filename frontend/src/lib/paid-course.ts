export type PaidCourseOffer = {
  program: string;
  title: string;
  registrationClosesAt: string;
  registrationOpen: boolean;
  cashPrice: number;
  regularPrice: number;
  deposit: number;
  installmentAmount: number;
  installmentTotal: number;
  installmentDueDates: string[];
  sessions: string[];
  timezone: string;
};
export const paidCourseClose = "2026-11-18T23:59:59-06:00";
export const formatMxn = (amount: number) =>
  `$${amount.toLocaleString("es-MX")} MXN`;
