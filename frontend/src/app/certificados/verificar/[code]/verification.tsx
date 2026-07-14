"use client";
import { apiFetch } from "@/lib/api";
import {
  Award,
  BadgeCheck,
  Calendar,
  Clock3,
  Download,
  LoaderCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./verification.module.css";
type Certificate = {
  folio: string;
  verificationCode: string;
  pdfUrl: string;
  status: "ACTIVE" | "REVOKED";
  issuedAt: string;
  user: { firstName: string; lastName: string };
  course: {
    title: string;
    estimatedMinutes: number;
    instructor?: { firstName: string; lastName: string };
  };
};
export function CertificateVerification({ code }: { code: string }) {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void apiFetch<Certificate>(`/certificates/verify/${code}`)
      .then(setCertificate)
      .catch((value) =>
        setError(
          value instanceof Error ? value.message : "Certificado no encontrado",
        ),
      );
  }, [code]);
  if (error)
    return (
      <main className={styles.state}>
        <XCircle />
        <h1>Certificado no válido</h1>
        <p>{error}</p>
        <Link href="/">Volver al inicio</Link>
      </main>
    );
  if (!certificate)
    return (
      <main className={styles.state}>
        <LoaderCircle className={styles.spin} />
        Verificando certificado…
      </main>
    );
  const active = certificate.status === "ACTIVE";
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <header>
          <div>
            <span>LT</span>
            <strong>Luis Toledo Academy</strong>
          </div>
          <BadgeCheck />
        </header>
        <section>
          <Award />
          <span>Verificación oficial</span>
          <h1>{active ? "Certificado auténtico" : "Certificado revocado"}</h1>
          <p>Este documento confirma que</p>
          <h2>
            {certificate.user.firstName} {certificate.user.lastName}
          </h2>
          <p>completó satisfactoriamente el curso</p>
          <h3>{certificate.course.title}</h3>
        </section>
        <div className={styles.details}>
          <div>
            <Calendar />
            <span>Fecha de emisión</span>
            <strong>
              {new Date(certificate.issuedAt).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </strong>
          </div>
          <div>
            <Clock3 />
            <span>Duración</span>
            <strong>{certificate.course.estimatedMinutes} minutos</strong>
          </div>
          <div>
            <BadgeCheck />
            <span>Folio</span>
            <strong>{certificate.folio}</strong>
          </div>
        </div>
        <footer>
          <span>Código de verificación</span>
          <code>{certificate.verificationCode}</code>
          {active && (
            <a href={certificate.pdfUrl} target="_blank" rel="noreferrer">
              <Download />
              Descargar PDF
            </a>
          )}
        </footer>
      </div>
      <Link href="/">Luis Toledo Academy</Link>
    </main>
  );
}
