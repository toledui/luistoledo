"use client";
import { apiFetch } from "@/lib/api";
import { BookOpen, Copy, LoaderCircle, Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./courses.module.css";
type Course = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  price: string;
  salePrice?: string;
  updatedAt: string;
  coverMedia?: { url: string; altText?: string };
  category?: { name: string };
  _count: { sections: number };
};
export function CoursesList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const router = useRouter();
  useEffect(() => {
    apiFetch<Course[]>("/admin/courses")
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) return;
    const course = await apiFetch<Course>("/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    router.push(`/admin/cursos/${course.id}`);
  }
  async function duplicate(id: string) {
    const course = await apiFetch<Course>(`/admin/courses/${id}/duplicate`, {
      method: "POST",
    });
    router.push(`/admin/cursos/${course.id}`);
  }
  const visible = courses.filter((course) =>
    course.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <main className={styles.page}>
      <header>
        <div>
          <span>Contenido · Cursos</span>
          <h1>Tu oferta académica.</h1>
          <p>Crea cursos, organiza temarios y controla su publicación.</p>
        </div>
        <button onClick={() => setCreating(true)}>
          <Plus size={17} />
          Nuevo curso
        </button>
      </header>
      <section className={styles.metrics}>
        <article>
          <BookOpen />
          <strong>{courses.length}</strong>
          <small>Total</small>
        </article>
        <article>
          <strong>
            {courses.filter((c) => c.status === "PUBLISHED").length}
          </strong>
          <small>Publicados</small>
        </article>
        <article>
          <strong>{courses.filter((c) => c.status === "DRAFT").length}</strong>
          <small>Borradores</small>
        </article>
      </section>
      <label className={styles.search}>
        <Search size={17} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cursos"
        />
      </label>
      {loading ? (
        <div className={styles.empty}>
          <LoaderCircle className={styles.spin} />
          Cargando cursos…
        </div>
      ) : visible.length ? (
        <section className={styles.courseGrid}>
          {visible.map((course) => (
            <article className={styles.courseCard} key={course.id}>
              <Link
                href={`/admin/cursos/${course.id}`}
                className={styles.cover}
              >
                {course.coverMedia ? (
                  <Image
                    src={course.coverMedia.url}
                    alt={course.coverMedia.altText || course.title}
                    fill
                    quality={85}
                    sizes="(max-width: 760px) calc(100vw - 48px), (max-width: 1200px) 50vw, 340px"
                  />
                ) : (
                  <BookOpen size={38} />
                )}
                <b className={styles[course.status.toLowerCase()]}>
                  {course.status}
                </b>
              </Link>
              <div>
                <small>{course.category?.name || "Sin categoría"}</small>
                <Link href={`/admin/cursos/${course.id}`}>
                  <h2>{course.title}</h2>
                </Link>
                <p>/{course.slug}</p>
                <footer>
                  <span>{course._count.sections} módulos</span>
                  <strong>
                    {Number(course.salePrice || course.price) === 0
                      ? "Gratis"
                      : `$${Number(course.salePrice || course.price).toLocaleString("es-MX")} MXN`}
                  </strong>
                  <button
                    title="Duplicar"
                    onClick={() => void duplicate(course.id)}
                  >
                    <Copy size={15} />
                  </button>
                </footer>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className={styles.empty}>
          <BookOpen size={38} />
          <strong>Crea tu primer curso</strong>
          <span>
            Comienza con la información general y después agrega el temario.
          </span>
        </div>
      )}
      {creating && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setCreating(false)}
        >
          <form
            className={styles.modal}
            onSubmit={create}
            onClick={(event) => event.stopPropagation()}
          >
            <BookOpen size={28} />
            <h2>Crear nuevo curso</h2>
            <p>
              Comenzará como borrador. Después podrás agregar su información,
              portada y temario.
            </p>
            <label>
              Nombre del curso
              <input
                autoFocus
                required
                maxLength={191}
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Ej. Desarrollo Web Full Stack"
              />
            </label>
            <div>
              <button type="button" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button type="submit">
                <Plus size={16} /> Crear y editar
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
