"use client";
import { useCart } from "@/components/cart/cart-context";
import { apiFetch } from "@/lib/api";
import {
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ReceiptText,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "../commerce.module.css";
import { PublicNavbar } from "@/components/public-navbar/public-navbar";
type Methods = { stripeEnabled: boolean; bankTransferEnabled: boolean };
type User = { email: string; firstName: string; lastName: string };
type Result = { order: { id: string }; checkoutUrl?: string };
export function CheckoutView() {
  const cart = useCart();
  const router = useRouter();
  const [methods, setMethods] = useState<Methods | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [createAccount, setCreateAccount] = useState(true);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponSummary, setCouponSummary] = useState<{
    subtotal: string;
    discount: string;
    total: string;
  } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "STRIPE" | "BANK_TRANSFER"
  >("STRIPE");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void apiFetch<Methods>("/payments/methods").then((m) => {
      setMethods(m);
      if (!m.stripeEnabled && m.bankTransferEnabled)
        setPaymentMethod("BANK_TRANSFER");
    });
    void apiFetch<User>("/auth/me")
      .then((u) => {
        setUser(u);
        setEmail(u.email);
      })
      .catch(() => undefined);
  }, []);
  async function checkEmail() {
    if (!email) return;
    setError("");
    try {
      const value = await apiFetch<{ exists: boolean }>("/auth/email-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setEmailExists(value.exists);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No fue posible validar el correo",
      );
    }
  }
  async function authenticate() {
    if (user) return;
    await checkEmail();
    const status = await apiFetch<{ exists: boolean }>("/auth/email-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setEmailExists(status.exists);
    if (status.exists) {
      if (!password)
        throw new Error("Escribe la contraseña de tu cuenta para continuar.");
      const response = await apiFetch<{ user: User }>("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      setUser(response.user);
    } else {
      if (!createAccount)
        throw new Error(
          "Necesitas crear una cuenta de acceso para consultar los cursos comprados.",
        );
      if (!firstName || !lastName)
        throw new Error("Escribe tu nombre y apellidos.");
      const response = await apiFetch<{ user: User }>(
        "/auth/checkout-account",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, firstName, lastName }),
        },
      );
      setUser(response.user);
    }
  }
  async function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code) {
      setCouponMessage("Escribe un código de cupón.");
      return;
    }
    if (!cart.items.length) {
      setCouponMessage("Agrega al menos un curso antes de aplicar el cupón.");
      return;
    }
    setApplyingCoupon(true);
    setCouponMessage("");
    try {
      const result = await apiFetch<{
        code: string;
        subtotal: string;
        discount: string;
        total: string;
      }>("/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          courseIds: cart.items.map((item) => item.id),
        }),
      });
      setCoupon(result.code);
      setAppliedCoupon(result.code);
      setCouponSummary(result);
      setCouponMessage(`Cupón ${result.code} aplicado correctamente.`);
    } catch (cause) {
      setAppliedCoupon("");
      setCouponSummary(null);
      setCouponMessage(
        cause instanceof Error ? cause.message : "El cupón no es válido.",
      );
    } finally {
      setApplyingCoupon(false);
    }
  }
  function removeItem(id: string) {
    cart.remove(id);
    setAppliedCoupon("");
    setCouponSummary(null);
    setCouponMessage(
      appliedCoupon ? "El carrito cambió. Vuelve a aplicar el cupón." : "",
    );
  }
  async function pay() {
    if (!cart.items.length) return;
    setPaying(true);
    setError("");
    try {
      await authenticate();
      await apiFetch("/cart", { method: "DELETE" });
      for (const item of cart.items)
        await apiFetch("/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: item.id }),
        });
      const result = await apiFetch<Result>("/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode: appliedCoupon || undefined,
          paymentMethod,
        }),
      });
      cart.clear();
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      router.push(`/checkout/pendiente?order=${result.order.id}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No fue posible procesar el pedido",
      );
      setPaying(false);
    }
  }
  if (!methods)
    return (
      <main className={styles.state}>
        <LoaderCircle className={styles.spin} />
        Preparando checkout…
      </main>
    );
  return (
    <>
      <PublicNavbar />
      <main className={styles.page}>
        <div className={styles.checkout}>
          <section>
            <span>Finalizar compra</span>
            <h1>Tu pedido y acceso</h1>
            {!user ? (
              <>
                <h2>
                  <Mail />
                  Correo de acceso
                </h2>
                <div className={styles.emailCheck}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailExists(null);
                    }}
                    onBlur={() => void checkEmail()}
                    placeholder="tu@correo.com"
                  />
                  <button onClick={() => void checkEmail()}>Continuar</button>
                </div>
                {emailExists === true && (
                  <div className={styles.identityBox}>
                    <UserRound />
                    <div>
                      <strong>Este correo ya tiene cuenta</strong>
                      <p>
                        Escribe tu contraseña para iniciar sesión y conservar
                        tus compras en el mismo perfil.
                      </p>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña"
                      />
                    </div>
                  </div>
                )}
                {emailExists === false && (
                  <div className={styles.identityBox}>
                    <UserRound />
                    <div>
                      <strong>Correo nuevo</strong>
                      <p>
                        Completa tus datos para recibir el acceso a los cursos.
                      </p>
                      <div className={styles.nameFields}>
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Nombre"
                        />
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Apellidos"
                        />
                      </div>
                      <label>
                        <input
                          type="checkbox"
                          checked={createAccount}
                          onChange={(e) => setCreateAccount(e.target.checked)}
                        />
                        Crear mi cuenta al finalizar y enviarme un enlace seguro
                        para establecer contraseña.
                      </label>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.notice}>
                <BadgeCheck />
                <div>
                  <strong>Comprarás como {user.firstName}</strong>
                  <p>{user.email}</p>
                </div>
              </div>
            )}
            <h2>Método de pago</h2>
            <div className={styles.paymentMethods}>
              {methods.stripeEnabled && (
                <label
                  className={
                    paymentMethod === "STRIPE" ? styles.selectedMethod : ""
                  }
                >
                  <input
                    type="radio"
                    checked={paymentMethod === "STRIPE"}
                    onChange={() => setPaymentMethod("STRIPE")}
                  />
                  <CreditCard />
                  <span>
                    <strong>Tarjeta con Stripe</strong>
                    <small>Confirmación automática</small>
                  </span>
                </label>
              )}
              {methods.bankTransferEnabled && (
                <label
                  className={
                    paymentMethod === "BANK_TRANSFER"
                      ? styles.selectedMethod
                      : ""
                  }
                >
                  <input
                    type="radio"
                    checked={paymentMethod === "BANK_TRANSFER"}
                    onChange={() => setPaymentMethod("BANK_TRANSFER")}
                  />
                  <Landmark />
                  <span>
                    <strong>Transferencia bancaria</strong>
                    <small>Validación manual</small>
                  </span>
                </label>
              )}
            </div>
            <h2>
              <Tag />
              Cupón
            </h2>
            <div className={styles.coupon}>
              <input
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value.toUpperCase());
                  if (
                    appliedCoupon &&
                    e.target.value.toUpperCase() !== appliedCoupon
                  ) {
                    setAppliedCoupon("");
                    setCouponSummary(null);
                    setCouponMessage(
                      "Pulsa Aplicar para validar el nuevo código.",
                    );
                  }
                }}
                placeholder="CÓDIGO"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void applyCoupon();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void applyCoupon()}
                disabled={applyingCoupon || !coupon.trim()}
              >
                {applyingCoupon ? (
                  <LoaderCircle className={styles.spin} />
                ) : (
                  "Aplicar"
                )}
              </button>
            </div>
            {couponMessage && (
              <p
                className={
                  appliedCoupon ? styles.couponSuccess : styles.couponError
                }
              >
                {appliedCoupon && <CheckCircle2 />}
                {couponMessage}
              </p>
            )}
            {error && <p className={styles.error}>{error}</p>}
          </section>
          <aside className={styles.summary}>
            <h2>
              <ReceiptText />
              Tu pedido
            </h2>
            {cart.items.map((item) => (
              <div className={styles.checkoutItem} key={item.id}>
                <span>{item.title}</span>
                <strong>
                  $
                  {Number(item.salePrice || item.price).toLocaleString("es-MX")}
                </strong>
                <button onClick={() => removeItem(item.id)}>
                  <Trash2 />
                </button>
              </div>
            ))}
            {!cart.items.length && <p>No hay cursos seleccionados.</p>}
            {couponSummary && (
              <p className={styles.discount}>
                <span>Descuento · {appliedCoupon}</span>
                <strong>
                  −${Number(couponSummary.discount).toLocaleString("es-MX")} MXN
                </strong>
              </p>
            )}
            <p className={styles.total}>
              <span>Total</span>
              <strong>
                $
                {Number(couponSummary?.total ?? cart.total).toLocaleString(
                  "es-MX",
                )}{" "}
                MXN
              </strong>
            </p>
            <button
              onClick={() => void pay()}
              disabled={paying || !cart.items.length}
            >
              {paying ? (
                <LoaderCircle className={styles.spin} />
              ) : (
                <LockKeyhole />
              )}
              {paymentMethod === "STRIPE"
                ? "Continuar a Stripe"
                : "Generar referencia"}
            </button>
            <small>
              No enviamos contraseñas en texto plano. Recibirás un enlace seguro
              para configurar tu acceso.
            </small>
          </aside>
        </div>
      </main>
    </>
  );
}
