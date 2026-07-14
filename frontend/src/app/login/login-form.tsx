"use client";

import { ArrowRight, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import styles from "./login.module.css";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type LoginValues = { email: string; password: string };
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const { register, handleSubmit } = useForm<LoginValues>();

  useEffect(() => {
    void apiFetch<{ roles: string[] }>("/auth/me")
      .then((user) =>
        router.replace(
          user.roles.includes("SUPER_ADMIN") ? "/admin" : "/mi-aprendizaje",
        ),
      )
      .catch(() => setCheckingSession(false));
  }, [router]);

  async function login(values: LoginValues) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error("Correo o contraseña incorrectos.");
      const result = (await response.json()) as { user: { roles: string[] } };
      router.push(
        result.user.roles.includes("SUPER_ADMIN")
          ? "/admin"
          : "/mi-aprendizaje",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible iniciar sesión.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession)
    return (
      <div className={styles.sessionCheck}>
        <LoaderCircle className={styles.spin} size={20} />
        Revisando tu sesión…
      </div>
    );

  return (
    <form onSubmit={handleSubmit(login)} className={styles.form}>
      <label>
        Correo electrónico
        <div>
          <Mail size={18} />
          <input
            type="email"
            placeholder="tu@correo.com"
            autoComplete="email"
            {...register("email", { required: true })}
          />
        </div>
      </label>
      <label>
        Contraseña
        <div>
          <LockKeyhole size={18} />
          <input
            type="password"
            placeholder="Escribe tu contraseña"
            autoComplete="current-password"
            {...register("password", { required: true })}
          />
        </div>
      </label>
      <Link className={styles.forgotLink} href="/recuperar-contrasena">
        ¿Olvidaste tu contraseña?
      </Link>
      {error && <p className={styles.error}>{error}</p>}
      <button disabled={loading}>
        {loading ? (
          <LoaderCircle className={styles.spin} size={18} />
        ) : (
          <ArrowRight size={18} />
        )}
        Iniciar sesión
      </button>
      <div className={styles.registerPrompt}>
        <span>¿Todavía no tienes cuenta?</span>
        <Link href="/registro">Crear una cuenta</Link>
      </div>
    </form>
  );
}
