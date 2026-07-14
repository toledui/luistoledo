"use client";
import { apiFetch } from "@/lib/api";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  GraduationCap,
  LoaderCircle,
  Search,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./catalog.module.css";
import { PublicNavbar } from "@/components/public-navbar/public-navbar";
type Course = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  shortDescription?: string;
  level: string;
  price: string;
  salePrice?: string;
  estimatedMinutes: number;
  featured: boolean;
  coverMedia?: { url: string; altText?: string };
  category?: { name: string; slug: string };
  _count: { sections: number; enrollments: number };
};
type Category = { id: string; name: string; slug: string };
export function CourseCatalog() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (level) params.set("level", level);
    try {
      const [cats, items] = await Promise.all([
        apiFetch<Category[]>("/catalog/categories"),
        apiFetch<Course[]>(`/courses?${params}`),
      ]);
      setCategories(cats);
      setCourses(items);
    } finally {
      setLoading(false);
    }
  }, [search, category, level]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);
  return (
    <>
      <PublicNavbar />
      <main className={styles.page}>
      <header>
        <section>
          <span>Formación práctica · A tu ritmo</span>
          <h1>Cursos para convertir conocimiento en resultados.</h1>
          <p>
            Aprende con una ruta clara, contenido aplicable y acceso desde
            cualquier dispositivo.
          </p>
        </section>
      </header>
      <section className={styles.catalog}>
        <div className={styles.filters}>
          <label>
            <Search />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="¿Qué quieres aprender?"
            />
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((item) => (
              <option value={item.slug} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Todos los niveles</option>
            <option value="BEGINNER">Principiante</option>
            <option value="INTERMEDIATE">Intermedio</option>
            <option value="ADVANCED">Avanzado</option>
            <option value="ALL_LEVELS">Todos los niveles</option>
          </select>
        </div>
        {loading ? (
          <div className={styles.empty}>
            <LoaderCircle className={styles.spin} />
            Buscando cursos…
          </div>
        ) : courses.length ? (
          <div className={styles.grid}>
            {courses.map((course) => (
              <article key={course.id}>
                <Link href={`/cursos/${course.slug}`} className={styles.cover}>
                  {course.coverMedia ? (
                    <Image
                      src={course.coverMedia.url}
                      alt={course.coverMedia.altText || course.title}
                      fill
                      quality={85}
                      sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1050px) 50vw, 370px"
                    />
                  ) : (
                    <BookOpen />
                  )}
                  {course.featured && <b>Destacado</b>}
                </Link>
                <div className={styles.body}>
                  <span>{course.category?.name || "Curso online"}</span>
                  <Link href={`/cursos/${course.slug}`}>
                    <h2>{course.title}</h2>
                  </Link>
                  <p>
                    {course.subtitle ||
                      course.shortDescription ||
                      "Descubre una ruta de aprendizaje diseñada para avanzar."}
                  </p>
                  <div className={styles.details}>
                    <small>
                      <GraduationCap />
                      {course.level.replace("_", " ")}
                    </small>
                    <small>
                      <Clock3 />
                      {course.estimatedMinutes} min
                    </small>
                    <small>
                      <Users />
                      {course._count.enrollments}
                    </small>
                  </div>
                  <footer>
                    <div>
                      {course.salePrice && (
                        <del>
                          ${Number(course.price).toLocaleString("es-MX")}
                        </del>
                      )}
                      <strong>
                        {Number(course.salePrice || course.price) === 0
                          ? "Gratis"
                          : `$${Number(course.salePrice || course.price).toLocaleString("es-MX")} MXN`}
                      </strong>
                    </div>
                    <Link href={`/cursos/${course.slug}`}>
                      Ver curso
                      <ArrowRight />
                    </Link>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <BookOpen />
            <strong>No encontramos cursos con esos filtros.</strong>
            <span>Prueba con otra categoría o término de búsqueda.</span>
          </div>
        )}
      </section>
      </main>
    </>
  );
}
