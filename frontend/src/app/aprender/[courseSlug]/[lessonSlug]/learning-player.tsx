"use client";

import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Menu,
  PlayCircle,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./learning.module.css";
import { QuizPlayer } from "./quiz-player";

type Media = { url: string; name: string; provider?: string };
type Lesson = {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO_EMBED" | "DOCUMENT" | "QUIZ";
  content?: string;
  media?: Media;
  durationMinutes: number;
};
type Course = {
  title: string;
  slug: string;
  sections: { id: string; title: string; lessons: Lesson[] }[];
  lessonProgress: {
    lessonId: string;
    completed: boolean;
    consumedSeconds: number;
  }[];
  courseProgress?: {
    percentage: number;
    lastLessonId?: string;
  };
};

export function LearningPlayer({
  courseSlug,
  initialLessonId,
}: {
  courseSlug: string;
  initialLessonId: string;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [selectedId, setSelectedId] = useState(initialLessonId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );
  const autoCompletedLesson = useRef<string | null>(null);
  const router = useRouter();

  function applyCourse(value: Course) {
    setCourse(value);
    const lessons = value.sections.flatMap((section) => section.lessons);
    const validInitial = lessons.some(
      (lesson) => lesson.id === initialLessonId,
    );
    const target = validInitial
      ? initialLessonId
      : value.courseProgress?.lastLessonId || lessons[0]?.id;
    if (target) setSelectedId(target);
  }

  useEffect(() => {
    void apiFetch<Course>(`/learning/courses/${courseSlug}`)
      .then((value) => {
        setCourse(value);
        const lessons = value.sections.flatMap((section) => section.lessons);
        const validInitial = lessons.some(
          (lesson) => lesson.id === initialLessonId,
        );
        const target = validInitial
          ? initialLessonId
          : value.courseProgress?.lastLessonId || lessons[0]?.id;
        if (target) setSelectedId(target);
      })
      .catch((value) =>
        setError(
          value instanceof Error ? value.message : "Curso no disponible",
        ),
      );
  }, [courseSlug, initialLessonId]);

  const lessons = useMemo(
    () => course?.sections.flatMap((section) => section.lessons) ?? [],
    [course],
  );
  const lesson = lessons.find((item) => item.id === selectedId);
  const index = lessons.findIndex((item) => item.id === selectedId);
  const completed = new Set(
    course?.lessonProgress
      .filter((progress) => progress.completed)
      .map((progress) => progress.lessonId) ?? [],
  );
  const percentage = course?.courseProgress?.percentage ?? 0;

  useEffect(() => {
    if (!selectedId || !course) return;
    void apiFetch(`/learning/lessons/${selectedId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consumedSeconds: 0 }),
    }).catch(() => undefined);
    const timer = window.setInterval(() => {
      void apiFetch(`/learning/lessons/${selectedId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumedSeconds: 30 }),
      }).catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [selectedId, course]);

  function select(id: string) {
    const section = course?.sections.find((item) =>
      item.lessons.some((lessonItem) => lessonItem.id === id),
    );
    if (section) {
      setCollapsedSections((current) => {
        const next = new Set(current);
        next.delete(section.id);
        return next;
      });
    }
    setSelectedId(id);
    setMenuOpen(false);
    router.replace(`/aprender/${courseSlug}/${id}`);
  }

  async function completeLesson(advance = true) {
    if (!lesson) return;
    setSaving(true);
    try {
      await apiFetch(`/learning/lessons/${lesson.id}/complete`, {
        method: "POST",
      });
      const updated = await apiFetch<Course>(`/learning/courses/${courseSlug}`);
      applyCourse(updated);
      if (advance && index < lessons.length - 1) select(lessons[index + 1].id);
    } finally {
      setSaving(false);
    }
  }

  function completeVideoAutomatically() {
    if (!lesson || completed.has(lesson.id)) return;
    if (autoCompletedLesson.current === lesson.id) return;
    autoCompletedLesson.current = lesson.id;
    void completeLesson(false).catch(() => {
      autoCompletedLesson.current = null;
    });
  }

  function toggleSection(sectionId: string) {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  if (error)
    return (
      <main className={styles.state}>
        <LockKeyhole />
        <h1>No tienes acceso a este curso</h1>
        <p>{error}</p>
        <Link href="/mi-aprendizaje">Volver a mi aprendizaje</Link>
      </main>
    );
  if (!course)
    return (
      <main className={styles.state}>
        <LoaderCircle className={styles.spin} />
        Preparando tu lección…
      </main>
    );

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/mi-aprendizaje">
          <ArrowLeft />
          Mi aprendizaje
        </Link>
        <div>
          <strong>{course.title}</strong>
          <span>{percentage}% completado</span>
        </div>
        <button
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? "Cerrar temario" : "Abrir temario"}
          aria-expanded={menuOpen}
          aria-controls="course-content-sidebar"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>
      <div className={styles.progress}>
        <i style={{ width: `${percentage}%` }} />
      </div>
      <div
        className={`${styles.layout} ${sidebarCollapsed ? styles.layoutCollapsed : ""}`}
      >
        <section className={styles.content}>
          {sidebarCollapsed && (
            <button
              className={styles.expandSidebar}
              onClick={() => setSidebarCollapsed(false)}
            >
              <PanelRightOpen />
              Mostrar contenido del curso
            </button>
          )}
          <div className={styles.viewer}>
            {lesson?.type === "QUIZ" ? (
              <QuizPlayer
                lessonId={lesson.id}
                onPassed={() =>
                  void apiFetch<Course>(`/learning/courses/${courseSlug}`)
                    .then(setCourse)
                    .catch(() => undefined)
                }
              />
            ) : lesson?.type === "VIDEO_EMBED" && lesson.media ? (
              <EmbeddedVideo
                key={lesson.id}
                media={lesson.media}
                title={lesson.title}
                onEnded={completeVideoAutomatically}
              />
            ) : lesson?.type === "DOCUMENT" && lesson.media ? (
              <div className={styles.resource}>
                <FileText />
                <h2>{lesson.title}</h2>
                <p>{lesson.media.name}</p>
                <a href={lesson.media.url} target="_blank" rel="noreferrer">
                  Abrir documento
                </a>
              </div>
            ) : (
              <article className={styles.article}>
                <FileText />
                <h1>{lesson?.title}</h1>
                <p>{lesson?.content || "El contenido está en preparación."}</p>
              </article>
            )}
          </div>
          <div className={styles.lessonInfo}>
            <div>
              <span>
                Lección {index + 1} de {lessons.length}
              </span>
              <h1>{lesson?.title}</h1>
            </div>
            {lesson?.type !== "QUIZ" && (
              <button
                onClick={() => void completeLesson()}
                disabled={saving || !lesson || completed.has(lesson.id)}
              >
                {saving ? <LoaderCircle className={styles.spin} /> : <Check />}
                {lesson && completed.has(lesson.id)
                  ? "Completada"
                  : "Marcar como completada"}
              </button>
            )}
          </div>
          <nav className={styles.navigation}>
            <button
              disabled={index <= 0}
              onClick={() => select(lessons[index - 1].id)}
            >
              <ArrowLeft /> Anterior
            </button>
            <button
              disabled={index < 0 || index >= lessons.length - 1}
              onClick={() => select(lessons[index + 1].id)}
            >
              Siguiente <ArrowRight />
            </button>
          </nav>
        </section>
        <aside
          id="course-content-sidebar"
          className={`${styles.sidebar} ${menuOpen ? styles.open : ""} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}
        >
          <header>
            <div>
              <span>Contenido del curso</span>
              <strong>
                {completed.size} de {lessons.length} lecciones
              </strong>
            </div>
            <button
              className={styles.collapseSidebar}
              onClick={() => setSidebarCollapsed(true)}
              title="Ocultar contenido del curso"
            >
              <PanelRightClose />
            </button>
            <button
              className={styles.mobileCloseSidebar}
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar contenido del curso"
              title="Cerrar contenido del curso"
            >
              <X />
            </button>
          </header>
          {course.sections.map((section, sectionIndex) => (
            <section key={section.id}>
              <button
                type="button"
                className={styles.sectionToggle}
                onClick={() => toggleSection(section.id)}
                aria-expanded={!collapsedSections.has(section.id)}
              >
                <span>
                  {sectionIndex + 1}. {section.title}
                </span>
                <ChevronDown />
              </button>
              <div
                className={`${styles.sectionLessons} ${collapsedSections.has(section.id) ? styles.sectionLessonsCollapsed : ""}`}
              >
                {section.lessons.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === selectedId ? styles.active : ""}
                    onClick={() => select(item.id)}
                  >
                    {completed.has(item.id) ? (
                      <CheckCircle2 className={styles.completedIcon} />
                    ) : (
                      <PlayCircle />
                    )}
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </aside>
      </div>
    </main>
  );
}

function EmbeddedVideo({
  media,
  title,
  onEnded,
}: {
  media: Media;
  title: string;
  onEnded: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    let expectedOrigin = "";
    try {
      expectedOrigin = new URL(media.url).origin;
    } catch {
      return;
    }

    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.origin !== expectedOrigin) return;

      let payload: unknown = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = { event: payload };
        }
      }
      if (!payload || typeof payload !== "object") return;

      const message = payload as Record<string, unknown>;
      const nested =
        message.data && typeof message.data === "object"
          ? (message.data as Record<string, unknown>)
          : undefined;
      const signal = [
        message.event,
        message.type,
        message.action,
        message.status,
        message.name,
        nested?.event,
        nested?.type,
        nested?.status,
      ]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.toLowerCase().replace(/[\s_-]/g, ""));

      if (
        signal.some((value) =>
          [
            "ended",
            "videoended",
            "playbackended",
            "finished",
            "complete",
            "completed",
          ].includes(value),
        )
      ) {
        onEndedRef.current();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [media.url]);

  return (
    <iframe
      ref={iframeRef}
      src={media.url}
      title={title}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
}
