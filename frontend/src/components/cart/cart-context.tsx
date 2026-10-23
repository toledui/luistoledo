"use client";
import { CurrencyPrice } from "@/components/currency/currency-context";
import { BookOpen, ShoppingBag, Trash2, X } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import styles from "./cart.module.css";
import { trackEvent } from "@/lib/analytics";
export type LocalCartItem = {
  id: string;
  title: string;
  slug: string;
  price: string;
  salePrice?: string;
  coverUrl?: string;
};
type CartContextValue = {
  items: LocalCartItem[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (item: LocalCartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  total: number;
};
const CartContext = createContext<CartContextValue | null>(null);
const key = "lta_cart_v1";
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<LocalCartItem[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let restored: LocalCartItem[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "[]") as unknown;
      restored = Array.isArray(stored) ? (stored as LocalCartItem[]) : [];
    } catch {}
    queueMicrotask(() => setItems(restored));
  }, []);
  const save = useCallback((next: LocalCartItem[]) => {
    setItems(next);
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event("lta-cart"));
  }, []);
  const add = useCallback(
    (item: LocalCartItem) => {
      if (!items.some((x) => x.id === item.id)) {
        save([...items, item]);
        void trackEvent("add_to_cart", {
          itemId: item.id,
          itemName: item.title.slice(0, 100),
          value: Number(item.salePrice || item.price),
          currency: "MXN",
        });
      }
      setOpen(true);
    },
    [items, save],
  );
  const remove = useCallback(
    (id: string) => {
      const item = items.find((x) => x.id === id);
      save(items.filter((x) => x.id !== id));
      if (item)
        void trackEvent("remove_from_cart", {
          itemId: item.id,
          itemName: item.title.slice(0, 100),
          value: Number(item.salePrice || item.price),
          currency: "MXN",
        });
    },
    [items, save],
  );
  const clear = useCallback(() => save([]), [save]);
  const value = useMemo(
    () => ({
      items,
      open,
      setOpen,
      add,
      remove,
      clear,
      total: items.reduce((sum, x) => sum + Number(x.salePrice || x.price), 0),
    }),
    [items, open, add, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("CartProvider requerido");
  return value;
}
export function CartButton() {
  const cart = useCart();
  return (
    <>
      <button
        className={styles.button}
        onClick={() => cart.setOpen(true)}
        aria-label={`Carrito con ${cart.items.length} cursos`}
      >
        <ShoppingBag />
        <span>{cart.items.length}</span>
      </button>
      {cart.open && (
        <>
          <button
            className={styles.backdrop}
            onClick={() => cart.setOpen(false)}
            aria-label="Cerrar carrito"
          />
          <aside className={styles.drawer}>
            <header>
              <div>
                <span>Tu selección</span>
                <strong>{cart.items.length} cursos</strong>
              </div>
              <button onClick={() => cart.setOpen(false)}>
                <X />
              </button>
            </header>
            <section>
              {cart.items.length ? (
                cart.items.map((item) => (
                  <article key={item.id}>
                    <div>
                      <BookOpen />
                    </div>
                    <span>
                      <Link
                        href={`/cursos/${item.slug}`}
                        onClick={() => cart.setOpen(false)}
                      >
                        {item.title}
                      </Link>
                      <strong>
                        <CurrencyPrice amount={item.salePrice || item.price} />
                      </strong>
                    </span>
                    <button
                      onClick={() => cart.remove(item.id)}
                      aria-label={`Quitar ${item.title}`}
                    >
                      <Trash2 />
                    </button>
                  </article>
                ))
              ) : (
                <p>Tu carrito está vacío. Puedes seguir explorando cursos.</p>
              )}
            </section>
            {cart.items.length > 0 && (
              <footer>
                <div>
                  <span>Total</span>
                  <strong><CurrencyPrice amount={cart.total} /></strong>
                </div>
                <Link href="/checkout" onClick={() => cart.setOpen(false)}>
                  Ir al checkout
                </Link>
                <button onClick={() => cart.setOpen(false)}>
                  Seguir comprando
                </button>
              </footer>
            )}
          </aside>
        </>
      )}
    </>
  );
}
