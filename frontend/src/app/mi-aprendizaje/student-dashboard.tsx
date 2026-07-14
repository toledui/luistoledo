"use client";

import { apiFetch, ApiError } from "@/lib/api";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Search,
  Sparkles,
  Award,
  BadgeCheck,
  Download,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./student.module.css";
import { StudentNavbar } from "@/components/student-navbar/student-navbar";

type User = {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
};
type Enrollment = {
  id: string;
  course: {
    title: string;
    slug: string;
    shortDescription?: string;
    coverMedia?: { url: string };
    category?: { name: string };
    _count: { sections: number };
  };
  courseProgress?: { percentage: number; lastLessonId?: string };
};
type Certificate = {
  id: string;
  folio: string;
  verificationCode: string;
  pdfUrl: string;
  issuedAt: string;
  course: { title: string; slug: string };
};
export function StudentDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    void Promise.all([
      apiFetch<User>("/auth/me"),
      apiFetch<Enrollment[]>("/enrollments/me"),
      apiFetch<Certificate[]>("/certificates/me"),
    ])
      .then(([value, items, certificateItems]) => {
        if (
          !value.roles.includes("STUDENT") &&
          !value.roles.includes("SUPER_ADMIN")
        )
          throw new ApiError(403, "Acceso no disponible");
        setUser(value);
        setEnrollments(items);
        setCertificates(certificateItems);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);
  if (loading)
    return <div className={styles.loading}>Preparando tu espacio…</div>;
  if (!user) return null;
  return (
    <main className={styles.shell}>
      <StudentNavbar />
      <section className={styles.hero}>
        <div>
          <span>
            <Sparkles size={15} />
            Mi aprendizaje
          </span>
          <h1>Hola, {user.firstName}.</h1>
          <p>Aquí encontrarás tus cursos, avance, recursos y certificados.</p>
        </div>
        <div className={styles.avatar}>
          {user.firstName[0]}
          {user.lastName[0]}
        </div>
      </section>
      <section className={styles.stats}>
        <article>
          <BookOpen />
          <div>
            <span>Cursos activos</span>
            <strong>{enrollments.length}</strong>
          </div>
        </article>
        <article>
          <GraduationCap />
          <div>
            <span>Certificados</span>
            <strong>{certificates.length}</strong>
          </div>
        </article>
      </section>
      {enrollments.length ? (
        <section className={styles.myCourses}>
          {enrollments.map(({ id, course, courseProgress }) => (
            <article key={id}>
              <div className={styles.courseCover}>
                {course.coverMedia ? (
                  <Image
                    src={course.coverMedia.url}
                    alt={course.title}
                    fill
                    unoptimized
                  />
                ) : (
                  <BookOpen />
                )}
              </div>
              <div>
                <span>{course.category?.name || "Curso online"}</span>
                <h2>{course.title}</h2>
                <p>
                  {course.shortDescription ||
                    `${course._count.sections} módulos disponibles.`}
                </p>
                <div className={styles.courseProgress}>
                  <i style={{ width: `${courseProgress?.percentage ?? 0}%` }} />
                </div>
                <small>{courseProgress?.percentage ?? 0}% completado</small>
                <Link
                  href={`/aprender/${course.slug}/${courseProgress?.lastLessonId || "inicio"}`}
                >
                  Continuar curso
                  <ArrowRight />
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.empty}>
          <div>
            <Search size={30} />
          </div>
          <h2>Aún no tienes cursos inscritos.</h2>
          <p>
            Explora las rutas disponibles y comienza con la habilidad que más
            necesitas.
          </p>
          <Link href="/cursos">
            Explorar cursos
            <ArrowRight size={17} />
          </Link>
        </section>
      )}
      {certificates.length > 0 && (
        <section className={styles.certificates}>
          <header>
            <Award />
            <div>
              <h2>Mis certificados</h2>
              <p>Descarga y comparte tus logros verificados.</p>
            </div>
          </header>
          <div>
            {certificates.map((certificate) => (
              <article key={certificate.id}>
                <BadgeCheck />
                <div>
                  <span>Curso completado</span>
                  <h3>{certificate.course.title}</h3>
                  <small>{certificate.folio}</small>
                </div>
                <a href={certificate.pdfUrl} target="_blank" rel="noreferrer">
                  <Download /> PDF
                </a>
                <Link
                  href={`/certificados/verificar/${certificate.verificationCode}`}
                >
                  Verificar
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
