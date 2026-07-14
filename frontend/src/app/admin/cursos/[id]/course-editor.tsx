"use client";
import { apiFetch } from "@/lib/api";
import { ConfirmModal, Modal } from "@/components/admin/modal";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Film,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  Upload,
  ExternalLink,
  GraduationCap,
  CircleHelp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "../courses.module.css";
import { QuizEditor } from "./quiz-editor";
type Media = {
  id: string;
  name: string;
  url: string;
  kind: "IMAGE" | "DOCUMENT" | "VIDEO_EMBED";
  provider?: string;
};
type Lesson = {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO_EMBED" | "DOCUMENT" | "QUIZ";
  content?: string;
  mediaId?: string;
  media?: Media;
  durationMinutes: number;
  position: number;
  isPreview: boolean;
  isPublished: boolean;
};
type Section = {
  id: string;
  title: string;
  description?: string;
  position: number;
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
  status: string;
  level: string;
  language: string;
  price: string | number;
  salePrice?: string | number;
  estimatedMinutes: number;
  featured: boolean;
  categoryId?: string;
  coverMediaId?: string;
  instructorId?: string;
  coverMedia?: Media;
  sections: Section[];
};
type Metadata = {
  categories: { id: string; name: string }[];
  images: Media[];
  media: Media[];
  instructors: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }[];
};
type Enrollment = {
  id: string;
  status: string;
  source: string;
  enrolledAt: string;
  courseProgress?: { percentage: number };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  };
};
export function CourseEditor({ id }: { id: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [tab, setTab] = useState<"details" | "curriculum" | "students">(
    "details",
  );
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [studentId, setStudentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [message, setMessage] = useState("");
  const [creation, setCreation] = useState<null | {
    kind: "section" | "lesson";
    sectionId?: string;
    type?: Lesson["type"];
  }>(null);
  const [creationTitle, setCreationTitle] = useState("");
  const [deletePath, setDeletePath] = useState<string | null>(null);
  const [embedValues, setEmbedValues] = useState<Record<string, string>>({});
  const [busyLesson, setBusyLesson] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [c, m, enrolled] = await Promise.all([
      apiFetch<Course>(`/admin/courses/${id}`),
      apiFetch<Metadata>("/admin/courses/metadata"),
      apiFetch<Enrollment[]>(`/admin/courses/${id}/enrollments`),
    ]);
    setCourse(c);
    setMetadata(m);
    setEnrollments(enrolled);
  }, [id]);
  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  if (!course || !metadata)
    return (
      <div className={styles.empty}>
        <LoaderCircle className={styles.spin} />
        Cargando editor…
      </div>
    );
  function change<K extends keyof Course>(key: K, value: Course[K]) {
    setCourse((current) => (current ? { ...current, [key]: value } : current));
  }
  async function save() {
    if (!course) return;
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        title: course.title,
        slug: course.slug,
        subtitle: course.subtitle || "",
        shortDescription: course.shortDescription || "",
        description: course.description || "",
        objectives: course.objectives || "",
        requirements: course.requirements || "",
        status: course.status,
        level: course.level,
        language: course.language,
        price: Number(course.price),
        salePrice:
          course.salePrice === "" || course.salePrice == null
            ? null
            : Number(course.salePrice),
        estimatedMinutes: Number(course.estimatedMinutes),
        featured: course.featured,
        categoryId: course.categoryId || null,
        coverMediaId: course.coverMediaId || null,
        instructorId: course.instructorId || null,
      };
      const updated = await apiFetch<Course>(`/admin/courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setCourse(updated);
      setMessage("Curso guardado correctamente.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No fue posible guardar.");
    } finally {
      setSaving(false);
    }
  }
  async function addSection() {
    setCreationTitle("");
    setCreation({ kind: "section" });
  }
  async function addLesson(sectionId: string, type: Lesson["type"]) {
    setCreationTitle("");
    setCreation({ kind: "lesson", sectionId, type });
  }
  async function createFromModal(event: React.FormEvent) {
    event.preventDefault();
    if (!creation || !creationTitle.trim()) return;
    setSaving(true);
    try {
      if (creation.kind === "section") {
        await apiFetch(`/admin/courses/${id}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: creationTitle.trim() }),
        });
      } else if (creation.sectionId && creation.type) {
        await apiFetch(
          `/admin/courses/sections/${creation.sectionId}/lessons`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: creationTitle.trim(),
              type: creation.type,
            }),
          },
        );
      }
      setCreation(null);
      await load();
    } finally {
      setSaving(false);
    }
  }
  async function updateLesson(lesson: Lesson, values: Partial<Lesson>) {
    await apiFetch(`/admin/courses/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    await load();
  }
  async function remove(path: string) {
    await apiFetch(path, { method: "DELETE" });
    setDeletePath(null);
    await load();
  }
  async function assignCover(mediaId: string) {
    setSaving(true);
    setMessage("");
    try {
      const updated = await apiFetch<Course>(`/admin/courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverMediaId: mediaId || null }),
      });
      setCourse(updated);
      setMessage(mediaId ? "Portada asignada al curso." : "Portada eliminada.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible asignarla.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function uploadCover(file?: File) {
    if (!file) return;
    setUploadingCover(true);
    setMessage("");
    const body = new FormData();
    body.append("file", file);
    try {
      const asset = await apiFetch<Media>("/admin/media/upload", {
        method: "POST",
        body,
      });
      setMetadata((current) =>
        current
          ? {
              ...current,
              images: [asset, ...current.images],
              media: [asset, ...current.media],
            }
          : current,
      );
      await assignCover(asset.id);
      setMessage("Imagen guardada en la biblioteca y asignada como portada.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible subirla.",
      );
    } finally {
      setUploadingCover(false);
    }
  }
  function embedUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) throw new Error("Pega una URL o un iframe válido.");
    if (/^https:\/\//i.test(trimmed)) return trimmed;
    const document = new DOMParser().parseFromString(trimmed, "text/html");
    const source = document.querySelector("iframe")?.getAttribute("src");
    if (!source) throw new Error("El código debe contener un iframe con src.");
    return source.startsWith("//") ? `https:${source}` : source;
  }
  async function registerEmbed(lesson: Lesson) {
    setBusyLesson(lesson.id);
    setMessage("");
    try {
      const url = embedUrl(embedValues[lesson.id] || "");
      const asset = await apiFetch<Media>("/admin/media/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lesson.title,
          url,
          altText: lesson.title,
        }),
      });
      await apiFetch(`/admin/courses/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: asset.id }),
      });
      setEmbedValues((current) => ({ ...current, [lesson.id]: "" }));
      setMessage("Video registrado en la biblioteca y asignado a la lección.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible registrar el video.",
      );
    } finally {
      setBusyLesson(null);
    }
  }
  async function uploadLessonAsset(lesson: Lesson, file?: File) {
    if (!file) return;
    setBusyLesson(lesson.id);
    setMessage("");
    const body = new FormData();
    body.append("file", file);
    try {
      const asset = await apiFetch<Media>("/admin/media/upload", {
        method: "POST",
        body,
      });
      await apiFetch(`/admin/courses/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: asset.id }),
      });
      setMessage("Archivo guardado en la biblioteca y asignado a la lección.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible subir el archivo.",
      );
    } finally {
      setBusyLesson(null);
    }
  }
  async function enrollStudent() {
    if (!studentId) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/courses/${id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: studentId }),
      });
      setStudentId("");
      await load();
      setMessage("Alumno inscrito correctamente.");
    } finally {
      setSaving(false);
    }
  }
  async function removeEnrollment(enrollmentId: string) {
    await apiFetch(`/admin/enrollments/${enrollmentId}`, { method: "DELETE" });
    setEnrollments((current) =>
      current.filter((item) => item.id !== enrollmentId),
    );
  }
  return (
    <main className={styles.editor}>
      <div className={styles.editorTop}>
        <Link href="/admin/cursos">
          <ArrowLeft size={16} />
          Cursos
        </Link>
        <div>
          <span>{course.status}</span>
          <h1>{course.title}</h1>
          <small>/{course.slug}</small>
        </div>
        <div className={styles.editorActions}>
          <Link href={`/cursos/${course.slug}?preview=1`} target="_blank">
            <ExternalLink size={15} /> Ver página pública
          </Link>
          <button onClick={() => void save()} disabled={saving}>
            {saving ? <LoaderCircle className={styles.spin} /> : <Save />}
            Guardar
          </button>
        </div>
      </div>
      <nav className={styles.tabs}>
        <button
          className={tab === "details" ? styles.active : ""}
          onClick={() => setTab("details")}
        >
          Información y venta
        </button>
        <button
          className={tab === "curriculum" ? styles.active : ""}
          onClick={() => setTab("curriculum")}
        >
          Temario ({course.sections.length})
        </button>
        <button
          className={tab === "students" ? styles.active : ""}
          onClick={() => setTab("students")}
        >
          Alumnos ({enrollments.length})
        </button>
      </nav>
      {message && <div className={styles.notice}>{message}</div>}
      {tab === "details" ? (
        <div className={styles.editorGrid}>
          <form
            className={styles.courseForm}
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <section>
              <h2>Información principal</h2>
              <div className={styles.formGrid}>
                <label className={styles.full}>
                  Título
                  <input
                    value={course.title}
                    onChange={(e) => change("title", e.target.value)}
                    required
                  />
                </label>
                <label>
                  Slug
                  <input
                    value={course.slug}
                    onChange={(e) => change("slug", e.target.value)}
                  />
                </label>
                <label>
                  Subtítulo
                  <input
                    value={course.subtitle || ""}
                    onChange={(e) => change("subtitle", e.target.value)}
                  />
                </label>
                <label className={styles.full}>
                  Descripción corta
                  <textarea
                    value={course.shortDescription || ""}
                    onChange={(e) => change("shortDescription", e.target.value)}
                  />
                </label>
                <label className={styles.full}>
                  Descripción completa
                  <textarea
                    rows={6}
                    value={course.description || ""}
                    onChange={(e) => change("description", e.target.value)}
                  />
                </label>
              </div>
            </section>
            <section>
              <h2>Resultados y requisitos</h2>
              <div className={styles.formGrid}>
                <label>
                  Objetivos
                  <textarea
                    rows={5}
                    value={course.objectives || ""}
                    onChange={(e) => change("objectives", e.target.value)}
                    placeholder="Un punto por línea"
                  />
                </label>
                <label>
                  Requisitos
                  <textarea
                    rows={5}
                    value={course.requirements || ""}
                    onChange={(e) => change("requirements", e.target.value)}
                    placeholder="Un punto por línea"
                  />
                </label>
              </div>
            </section>
            <section>
              <h2>Clasificación y venta</h2>
              <div className={styles.formGrid}>
                <label>
                  Estado
                  <select
                    value={course.status}
                    onChange={(e) => change("status", e.target.value)}
                  >
                    <option value="DRAFT">Borrador</option>
                    <option value="PUBLISHED">Publicado</option>
                    <option value="ARCHIVED">Archivado</option>
                  </select>
                </label>
                <label>
                  Nivel
                  <select
                    value={course.level}
                    onChange={(e) => change("level", e.target.value)}
                  >
                    <option value="ALL_LEVELS">Todos los niveles</option>
                    <option value="BEGINNER">Principiante</option>
                    <option value="INTERMEDIATE">Intermedio</option>
                    <option value="ADVANCED">Avanzado</option>
                  </select>
                </label>
                <label>
                  Categoría
                  <select
                    value={course.categoryId || ""}
                    onChange={(e) => change("categoryId", e.target.value)}
                  >
                    <option value="">Sin categoría</option>
                    {metadata.categories.map((x) => (
                      <option value={x.id} key={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Instructor
                  <select
                    value={course.instructorId || ""}
                    onChange={(e) => change("instructorId", e.target.value)}
                  >
                    {metadata.instructors.map((x) => (
                      <option value={x.id} key={x.id}>
                        {x.firstName} {x.lastName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Precio MXN
                  <input
                    type="number"
                    min="0"
                    value={course.price}
                    onChange={(e) => change("price", e.target.value)}
                  />
                </label>
                <label>
                  Precio promocional
                  <input
                    type="number"
                    min="0"
                    value={course.salePrice || ""}
                    onChange={(e) => change("salePrice", e.target.value)}
                  />
                </label>
                <label>
                  Duración estimada (min)
                  <input
                    type="number"
                    min="0"
                    value={course.estimatedMinutes}
                    onChange={(e) =>
                      change("estimatedMinutes", Number(e.target.value))
                    }
                  />
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={course.featured}
                    onChange={(e) => change("featured", e.target.checked)}
                  />
                  Curso destacado
                </label>
              </div>
            </section>
          </form>
          <aside className={styles.coverPicker}>
            <h2>Portada del curso</h2>
            <div className={styles.coverPreview}>
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
            <select
              value={course.coverMediaId || ""}
              disabled={saving || uploadingCover}
              onChange={(e) => void assignCover(e.target.value)}
            >
              <option value="">Sin portada</option>
              {metadata.images.map((image) => (
                <option key={image.id} value={image.id}>
                  {image.name}
                </option>
              ))}
            </select>
            <div className={styles.coverDivider}>o sube una nueva</div>
            <label className={styles.coverUpload}>
              {uploadingCover ? (
                <LoaderCircle className={styles.spin} size={16} />
              ) : (
                <Upload size={16} />
              )}
              {uploadingCover ? "Subiendo portada…" : "Subir imagen"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={uploadingCover || saving}
                onChange={(event) => {
                  void uploadCover(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <small className={styles.coverHint}>
              PNG, JPG, WebP o GIF · Máximo 20 MB
            </small>
            <Link href="/admin/medios">Administrar biblioteca</Link>
          </aside>
        </div>
      ) : tab === "curriculum" ? (
        <section className={styles.curriculum}>
          <header>
            <div>
              <h2>Constructor del temario</h2>
              <p>
                Organiza módulos y agrega texto, videos embebidos o documentos.
              </p>
            </div>
            <button onClick={() => void addSection()}>
              <Plus />
              Nuevo módulo
            </button>
          </header>
          {course.sections.length ? (
            course.sections.map((section, index) => (
              <article className={styles.sectionCard} key={section.id}>
                <div className={styles.sectionHead}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{section.title}</strong>
                    <small>{section.lessons.length} lecciones</small>
                  </div>
                  <button title="Subir">
                    <ChevronUp />
                  </button>
                  <button title="Bajar">
                    <ChevronDown />
                  </button>
                  <button
                    title="Eliminar módulo"
                    onClick={() =>
                      setDeletePath(`/admin/courses/sections/${section.id}`)
                    }
                  >
                    <Trash2 />
                  </button>
                </div>
                <div className={styles.lessonList}>
                  {section.lessons.map((lesson, lessonIndex) => (
                    <div className={styles.lesson} key={lesson.id}>
                      <i>
                        {lesson.type === "VIDEO_EMBED" ? (
                          <Film />
                        ) : lesson.type === "QUIZ" ? (
                          <CircleHelp />
                        ) : (
                          <FileText />
                        )}
                      </i>
                      <div>
                        <input
                          value={lesson.title}
                          onChange={(e) =>
                            setCourse((current) =>
                              current
                                ? {
                                    ...current,
                                    sections: current.sections.map((s) =>
                                      s.id === section.id
                                        ? {
                                            ...s,
                                            lessons: s.lessons.map((l) =>
                                              l.id === lesson.id
                                                ? {
                                                    ...l,
                                                    title: e.target.value,
                                                  }
                                                : l,
                                            ),
                                          }
                                        : s,
                                    ),
                                  }
                                : current,
                            )
                          }
                          onBlur={() =>
                            void updateLesson(lesson, { title: lesson.title })
                          }
                        />
                        <small>
                          Lección {lessonIndex + 1} · {lesson.type}
                        </small>
                        {lesson.type === "QUIZ" ? (
                          <QuizEditor lessonId={lesson.id} />
                        ) : lesson.type === "TEXT" ? (
                          <textarea
                            placeholder="Contenido de la lección"
                            value={lesson.content || ""}
                            onChange={(e) =>
                              void updateLesson(lesson, {
                                content: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <div className={styles.resourceTools}>
                            <select
                              value={lesson.mediaId || ""}
                              onChange={(e) =>
                                void updateLesson(lesson, {
                                  mediaId: e.target.value,
                                })
                              }
                            >
                              <option value="">
                                Seleccionar desde la biblioteca
                              </option>
                              {metadata.media
                                .filter((asset) =>
                                  lesson.type === "VIDEO_EMBED"
                                    ? asset.kind === "VIDEO_EMBED"
                                    : asset.kind === "DOCUMENT" ||
                                      asset.kind === "IMAGE",
                                )
                                .map((asset) => (
                                  <option key={asset.id} value={asset.id}>
                                    {asset.name}
                                    {asset.provider
                                      ? ` · ${asset.provider}`
                                      : ""}
                                  </option>
                                ))}
                            </select>
                            {lesson.type === "VIDEO_EMBED" ? (
                              <div className={styles.embedEntry}>
                                <textarea
                                  value={embedValues[lesson.id] || ""}
                                  onChange={(event) =>
                                    setEmbedValues((current) => ({
                                      ...current,
                                      [lesson.id]: event.target.value,
                                    }))
                                  }
                                  placeholder={
                                    'Pega la URL HTTPS o el HTML: <iframe src="https://…"></iframe>'
                                  }
                                />
                                <button
                                  type="button"
                                  disabled={busyLesson === lesson.id}
                                  onClick={() => void registerEmbed(lesson)}
                                >
                                  {busyLesson === lesson.id ? (
                                    <LoaderCircle className={styles.spin} />
                                  ) : (
                                    <Film />
                                  )}
                                  Guardar embed
                                </button>
                              </div>
                            ) : (
                              <label className={styles.lessonUpload}>
                                {busyLesson === lesson.id ? (
                                  <LoaderCircle className={styles.spin} />
                                ) : (
                                  <Upload />
                                )}
                                {busyLesson === lesson.id
                                  ? "Subiendo…"
                                  : "Subir archivo o imagen"}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                  disabled={busyLesson === lesson.id}
                                  onChange={(event) => {
                                    void uploadLessonAsset(
                                      lesson,
                                      event.target.files?.[0],
                                    );
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                            {lesson.media && (
                              <small className={styles.assignedResource}>
                                Asignado: {lesson.media.name}
                              </small>
                            )}
                          </div>
                        )}
                      </div>
                      <label>
                        <input
                          type="checkbox"
                          checked={lesson.isPreview}
                          onChange={(e) =>
                            void updateLesson(lesson, {
                              isPreview: e.target.checked,
                            })
                          }
                        />
                        Muestra
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={lesson.isPublished}
                          onChange={(e) =>
                            void updateLesson(lesson, {
                              isPublished: e.target.checked,
                            })
                          }
                        />
                        Publicada
                      </label>
                      <button
                        onClick={() =>
                          setDeletePath(`/admin/courses/lessons/${lesson.id}`)
                        }
                      >
                        <Trash2 />
                      </button>
                    </div>
                  ))}
                </div>
                <footer>
                  <button onClick={() => void addLesson(section.id, "TEXT")}>
                    <FileText />
                    Texto
                  </button>
                  <button
                    onClick={() => void addLesson(section.id, "VIDEO_EMBED")}
                  >
                    <Film />
                    Video externo
                  </button>
                  <button
                    onClick={() => void addLesson(section.id, "DOCUMENT")}
                  >
                    <Plus />
                    Documento
                  </button>
                  <button onClick={() => void addLesson(section.id, "QUIZ")}>
                    <CircleHelp />
                    Cuestionario
                  </button>
                </footer>
              </article>
            ))
          ) : (
            <div className={styles.empty}>
              <BookOpen />
              <strong>El temario está vacío</strong>
              <span>Crea el primer módulo para comenzar.</span>
            </div>
          )}
        </section>
      ) : (
        <section className={styles.studentsPanel}>
          <header>
            <div>
              <h2>Alumnos inscritos</h2>
              <p>
                Asigna acceso manual y administra las inscripciones del curso.
              </p>
            </div>
            <div>
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
              >
                <option value="">Seleccionar usuario</option>
                {metadata.instructors
                  .filter(
                    (user) =>
                      !enrollments.some((item) => item.user.id === user.id),
                  )
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} · {user.email}
                    </option>
                  ))}
              </select>
              <button
                onClick={() => void enrollStudent()}
                disabled={!studentId || saving}
              >
                <Plus />
                Inscribir
              </button>
            </div>
          </header>
          {enrollments.length ? (
            <div className={styles.studentsTable}>
              <div>
                <span>Alumno</span>
                <span>Estado</span>
                <span>Origen</span>
                <span>Avance</span>
                <span>Fecha</span>
                <span />
              </div>
              {enrollments.map((item) => (
                <article key={item.id}>
                  <strong>
                    {item.user.firstName} {item.user.lastName}
                    <small>{item.user.email}</small>
                  </strong>
                  <b>{item.status}</b>
                  <span>{item.source}</span>
                  <span>{item.courseProgress?.percentage ?? 0}%</span>
                  <time>
                    {new Date(item.enrolledAt).toLocaleDateString("es-MX")}
                  </time>
                  <button onClick={() => void removeEnrollment(item.id)}>
                    <Trash2 />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <GraduationCap />
              <strong>No hay alumnos inscritos</strong>
              <span>Selecciona un usuario para asignarle acceso.</span>
            </div>
          )}
        </section>
      )}
      <Modal
        open={creation !== null}
        title={
          creation?.kind === "section"
            ? "Crear nuevo módulo"
            : "Crear nueva lección"
        }
        description={
          creation?.kind === "section"
            ? "Agrupa las lecciones relacionadas dentro del temario."
            : `Tipo de contenido: ${creation?.type === "VIDEO_EMBED" ? "video externo" : creation?.type === "DOCUMENT" ? "documento" : "texto"}.`
        }
        onClose={() => setCreation(null)}
        footer={
          <>
            <button type="button" onClick={() => setCreation(null)}>
              Cancelar
            </button>
            <button
              type="submit"
              form="curriculum-create-form"
              disabled={saving}
            >
              Crear
            </button>
          </>
        }
      >
        <form
          id="curriculum-create-form"
          className={styles.dialogForm}
          onSubmit={createFromModal}
        >
          <label>
            Nombre
            <input
              autoFocus
              required
              maxLength={191}
              value={creationTitle}
              onChange={(event) => setCreationTitle(event.target.value)}
              placeholder={
                creation?.kind === "section"
                  ? "Ej. Fundamentos"
                  : "Ej. Introducción al curso"
              }
            />
          </label>
        </form>
      </Modal>
      <ConfirmModal
        open={deletePath !== null}
        title="Eliminar contenido"
        description="Se eliminará este elemento. Si es un módulo, también se eliminarán todas sus lecciones."
        confirmLabel="Sí, eliminar"
        destructive
        onClose={() => setDeletePath(null)}
        onConfirm={() => {
          if (deletePath) void remove(deletePath);
        }}
      />
    </main>
  );
}
