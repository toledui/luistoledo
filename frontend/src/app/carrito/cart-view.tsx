"use client";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  BookOpen,
  LoaderCircle,
  LockKeyhole,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "../commerce.module.css";
export type Cart = {
  items: {
    id: string;
    courseId: string;
    course: {
      title: string;
      slug: string;
      shortDescription?: string;
      price: string;
      salePrice?: string;
      coverMedia?: { url: string };
    };
  }[];
  summary: {
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    currency: string;
    coupon?: string;
  };
};
export function CartView() {
  const [cart, setCart] = useState<Cart | null>(null);
  const router = useRouter();
  useEffect(() => {
    void apiFetch<Cart>("/cart")
      .then(setCart)
      .catch(() => router.replace("/login?next=/carrito"));
  }, [router]);
  async function remove(id: string) {
    setCart(await apiFetch<Cart>(`/cart/items/${id}`, { method: "DELETE" }));
  }
  if (!cart)
    return (
      <main className={styles.state}>
        <LoaderCircle className={styles.spin} />
        Cargando carrito…
      </main>
    );
  return (
    <main className={styles.page}>
      <header>
        <Link href="/cursos">
          <ArrowLeft />
          Seguir explorando
        </Link>
        <strong>Luis Toledo Academy</strong>
        <span>
          <LockKeyhole />
          Compra segura
        </span>
      </header>
      <div className={styles.layout}>
        <section>
          <div className={styles.title}>
            <ShoppingCart />
            <div>
              <span>Tu selección</span>
              <h1>Carrito de compra</h1>
            </div>
          </div>
          {cart.items.length ? (
            cart.items.map((item) => (
              <article className={styles.cartItem} key={item.id}>
                <div className={styles.thumb}>
                  {item.course.coverMedia ? (
                    <Image
                      src={item.course.coverMedia.url}
                      alt={item.course.title}
                      fill
                      unoptimized
                    />
                  ) : (
                    <BookOpen />
                  )}
                </div>
                <div>
                  <Link href={`/cursos/${item.course.slug}`}>
                    {item.course.title}
                  </Link>
                  <p>{item.course.shortDescription}</p>
                </div>
                <strong>
                  $
                  {Number(
                    item.course.salePrice || item.course.price,
                  ).toLocaleString("es-MX")}{" "}
                  MXN
                </strong>
                <button onClick={() => void remove(item.id)}>
                  <Trash2 />
                </button>
              </article>
            ))
          ) : (
            <div className={styles.empty}>
              <ShoppingCart />
              <h2>Tu carrito está vacío</h2>
              <Link href="/cursos">Explorar cursos</Link>
            </div>
          )}
        </section>
        <aside className={styles.summary}>
          <h2>Resumen</h2>
          <p>
            <span>Subtotal</span>
            <strong>
              ${Number(cart.summary.subtotal).toLocaleString("es-MX")}
            </strong>
          </p>
          <p>
            <span>Descuento</span>
            <strong>
              -${Number(cart.summary.discount).toLocaleString("es-MX")}
            </strong>
          </p>
          <p className={styles.total}>
            <span>Total</span>
            <strong>
              ${Number(cart.summary.total).toLocaleString("es-MX")} MXN
            </strong>
          </p>
          <Link
            className={!cart.items.length ? styles.disabled : ""}
            href={cart.items.length ? "/checkout" : "#"}
          >
            Continuar al checkout
          </Link>
        </aside>
      </div>
    </main>
  );
}
