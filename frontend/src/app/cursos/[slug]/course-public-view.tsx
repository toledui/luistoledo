"use client";
import { apiFetch } from "@/lib/api";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Film,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  PlayCircle,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./course.module.css";
import { useCart } from "@/components/cart/cart-context";
type Media = { url: string; name: string; kind: string; provider?: string };
type Lesson = {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO_EMBED" | "DOCUMENT" | "QUIZ";
  content?: string;
  media?: Media;
  durationMinutes: number;
  isPreview: boolean;
  isPublished: boolean;
};
type Section = {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
};
type Course = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  shortDescription?: string;
  description?: string;
  objectives?: string;
  requirements?: string;
  presentationVideoUrl?: string;
  status: string;
  level: string;
  price: string;
  salePrice?: string;
  estimatedMinutes: number;
  coverMedia?: Media;
  category?: { name: string };
  instructor?: { firstName: string; lastName: string };
  sections: Section[];
  adminPreview: boolean;
  enrolled?: boolean;
  startLessonId?: string;
  progressPercentage?: number;
};
const PRESENTATION_VIDEO = "__course_presentation__";
export function CoursePublicView({
  slug,
  adminPreview,
}: {
  slug: string;
  adminPreview: boolean;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentMessage, setEnrollmentMessage] = useState("");
  const router = useRouter();
  const cart = useCart();
  useEffect(() => {
    const load = async () => {
      if (adminPreview)
        return apiFetch<Course>(`/admin/courses/preview/${slug}`);
      try {
        return await apiFetch<Course>(`/enrollments/course/${slug}`);
      } catch {
        return apiFetch<Course>(`/courses/${slug}`);
      }
    };
    load()
      .then((value) => {
        setCourse(value);
        if (value.presentationVideoUrl) {
          setSelected(PRESENTATION_VIDEO);
          return;
        }
        const first = value.sections
          .flatMap((section) => section.lessons)
          .find((lesson) => adminPreview || lesson.isPreview);
        if (first) setSelected(first.id);
      })
      .catch((value) =>
        setError(
          value instanceof Error ? value.message : "Curso no disponible",
        ),
      );
  }, [slug, adminPreview]);
  const lessons = useMemo(
    () => course?.sections.flatMap((section) => section.lessons) ?? [],
    [course],
  );
  const lesson = lessons.find((item) => item.id === selected);
  const presentationSelected =
    selected === PRESENTATION_VIDEO && Boolean(course?.presentationVideoUrl);
  async function enroll() {
    if (!course) return;
    setEnrolling(true);
    setEnrollmentMessage("");
    try {
      await apiFetch(`/enrollments/free/${course.id}`, { method: "POST" });
      router.push("/mi-aprendizaje");
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 401) {
        router.push(`/login?next=/cursos/${course.slug}`);
      } else {
        setEnrollmentMessage(
          error instanceof Error
            ? error.message
            : "No fue posible completar la inscripción.",
        );
      }
    } finally {
      setEnrolling(false);
    }
  }
  async function addToCart() {
    if (!course) return;
    cart.add({
      id: course.id,
      title: course.title,
      slug: course.slug,
      price: course.price,
      salePrice: course.salePrice,
      coverUrl: course.coverMedia?.url,
    });
    setEnrollmentMessage(
      "Curso agregado. Puedes seguir explorando o ir al checkout.",
    );
  }
  if (error)
    return (
      <main className={styles.state}>
        <LockKeyhole />
        <h1>Curso no disponible</h1>
        <p>
          {adminPreview
            ? "Inicia sesión como administrador para utilizar la vista previa."
            : "Este curso todavía no está publicado."}
        </p>
        <Link href="/">Volver al inicio</Link>
      </main>
    );
  if (!course)
    return (
      <main className={styles.state}>
        <LoaderCircle className={styles.spin} />
        Cargando curso…
      </main>
    );
  return (
    <main className={styles.page}>
      {course.adminPreview && (
        <div className={styles.previewBar}>
          <span>
            <ShieldCheck />
            Vista previa administrativa
          </span>
        </div>
      )}
      <section className={styles.hero}>
        <div>
          <span>{course.category?.name || "Curso online"}</span>
          <h1>{course.title}</h1>
          <p>{course.subtitle || course.shortDescription}</p>
          <div className={styles.meta}>
            <b>
              <GraduationCap />
              Por{" "}
              {course.instructor
                ? `${course.instructor.firstName} ${course.instructor.lastName}`
                : "Luis Toledo"}
            </b>
            <b>
              <Clock3 />
              {course.estimatedMinutes || 0} minutos
            </b>
            <b>
              <BookOpen />
              {lessons.length} lecciones
            </b>
          </div>
          {course.adminPreview && (
            <div className={styles.previewNotice}>
              <ShieldCheck />
              Estás viendo todas las lecciones con acceso administrativo. Los
              alumnos y visitantes mantienen sus restricciones normales.
            </div>
          )}
          {!course.adminPreview && course.enrolled && (
            <div className={`${styles.enrollBox} ${styles.accessBox}`}>
              <span>
                <CheckCircle2 />
                <small>Ya tienes acceso a este curso</small>
                <strong>
                  {course.progressPercentage
                    ? `${course.progressPercentage}% completado`
                    : "Listo para comenzar"}
                </strong>
              </span>
              <button
                onClick={() =>
                  router.push(
                    `/aprender/${course.slug}/${course.startLessonId || "inicio"}`,
                  )
                }
              >
                <PlayCircle />
                {course.progressPercentage
                  ? "Continuar curso"
                  : "Comenzar curso"}
              </button>
            </div>
          )}
          {!course.adminPreview && !course.enrolled && (
            <div className={styles.enrollBox}>
              <strong>
                {Number(course.salePrice || course.price) === 0
                  ? "Acceso gratuito"
                  : `$${Number(course.salePrice || course.price).toLocaleString("es-MX")} MXN`}
              </strong>
              {Number(course.salePrice || course.price) === 0 ? (
                <button onClick={() => void enroll()} disabled={enrolling}>
                  {enrolling ? (
                    <LoaderCircle className={styles.spin} />
                  ) : (
                    <PlayCircle />
                  )}
                  Inscribirme gratis
                </button>
              ) : (
                <button onClick={() => void addToCart()} disabled={enrolling}>
                  {enrolling ? (
                    <LoaderCircle className={styles.spin} />
                  ) : (
                    <ShoppingCart />
                  )}
                  Agregar al carrito
                </button>
              )}
              {enrollmentMessage && <small>{enrollmentMessage}</small>}
            </div>
          )}
        </div>
        <aside>
          {course.coverMedia ? (
            <Image
              src={course.coverMedia.url}
              alt={course.title}
              fill
              quality={85}
              sizes="(max-width: 900px) calc(100vw - 40px), 480px"
            />
          ) : (
            <BookOpen />
          )}
        </aside>
      </section>
      <div className={styles.learning}>
        <section className={styles.player}>
          <div className={styles.screen}>
            {presentationSelected && course.presentationVideoUrl ? (
              <iframe
                src={course.presentationVideoUrl}
                title={`Presentación de ${course.title}`}
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; web-share"
                allowFullScreen
                loading="eager"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : lesson?.type === "VIDEO_EMBED" && lesson.media ? (
              <iframe
                src={lesson.media.url}
                title={lesson.title}
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; web-share"
                allowFullScreen
                loading="eager"
              />
            ) : lesson?.type === "DOCUMENT" && lesson.media ? (
              <div className={styles.resource}>
                <FileText />
                <h2>{lesson.title}</h2>
                <p>{lesson.media.name}</p>
                <a href={lesson.media.url} target="_blank" rel="noreferrer">
                  Abrir recurso
                </a>
              </div>
            ) : lesson ? (
              <div className={styles.textLesson}>
                <FileText />
                <h2>{lesson.title}</h2>
                <p>
                  {lesson.content ||
                    "El contenido de esta lección está en preparación."}
                </p>
              </div>
            ) : (
              <div className={styles.locked}>
                <PlayCircle />
                <h2>Selecciona una lección</h2>
              </div>
            )}
          </div>
          {presentationSelected ? (
            <div className={styles.lessonHeading}>
              <span>PRESENTACIÓN</span>
              <h2>Conoce todo lo que incluye este curso</h2>
            </div>
          ) : lesson ? (
            <div className={styles.lessonHeading}>
              <span>{lesson.type.replace("_EMBED", "")}</span>
              <h2>{lesson.title}</h2>
            </div>
          ) : null}
        </section>
        <aside className={styles.curriculum}>
          <header>
            <span>Contenido del curso</span>
            <strong>
              {course.sections.length} módulos · {lessons.length} lecciones
            </strong>
          </header>
          {course.presentationVideoUrl && (
            <section>
              <h3>
                <i>▶</i>
                Presentación
              </h3>
              <button
                className={presentationSelected ? styles.active : ""}
                onClick={() => setSelected(PRESENTATION_VIDEO)}
              >
                <Film />
                <span>
                  <strong>Conoce el curso</strong>
                  <small>Qué incluye y cómo funciona</small>
                </span>
                <CheckCircle2 />
              </button>
            </section>
          )}
          {course.sections.map((section, index) => (
            <section key={section.id}>
              <h3>
                <i>{index + 1}</i>
                {section.title}
              </h3>
              {section.lessons.map((item) => {
                const accessible =
                  course.adminPreview ||
                  Boolean(course.enrolled) ||
                  item.isPreview;
                return (
                  <button
                    key={item.id}
                    disabled={!accessible}
                    className={selected === item.id ? styles.active : ""}
                    onClick={() => accessible && setSelected(item.id)}
                  >
                    {item.type === "VIDEO_EMBED" ? <Film /> : <FileText />}
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.isPreview
                          ? "Vista gratuita"
                          : course.enrolled
                            ? "Incluida en tu inscripción"
                            : accessible
                              ? "Acceso administrador"
                              : "Contenido del curso"}
                      </small>
                    </span>
                    {accessible ? <CheckCircle2 /> : <LockKeyhole />}
                  </button>
                );
              })}
            </section>
          ))}
        </aside>
      </div>
      <section className={styles.about}>
        <div>
          <span>Acerca del curso</span>
          <h2>Lo que aprenderás</h2>
          <p>
            {course.description ||
              course.shortDescription ||
              "Próximamente encontrarás aquí todos los detalles del curso."}
          </p>
        </div>
        <aside>
          <h3>Objetivos</h3>
          <p>
            {course.objectives || "Los objetivos se publicarán próximamente."}
          </p>
          <h3>Requisitos</h3>
          <p>
            {course.requirements || "No se han definido requisitos previos."}
          </p>
        </aside>
      </section>
    </main>
  );
}
