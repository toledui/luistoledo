"use client";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
import { useForm } from "react-hook-form";
import s from "@/components/student-auth/student-auth.module.css";
type V = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};
export function RegisterForm() {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit } = useForm<V>();
  async function submit(v: V) {
    setBusy(true);
    setError("");
    try {
      await apiFetch(
        "/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(v),
        },
        false,
      );
      setMsg("Cuenta creada. Revisa tu correo para verificarla.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible registrarte.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={s.form} onSubmit={handleSubmit(submit)}>
      <div className={s.grid}>
        <label>
          Nombre
          <input
            autoComplete="given-name"
            placeholder="Tu nombre"
            {...register("firstName", { required: true })}
          />
        </label>
        <label>
          Apellidos
          <input
            autoComplete="family-name"
            placeholder="Tus apellidos"
            {...register("lastName", { required: true })}
          />
        </label>
      </div>
      <label>
        Correo
        <input
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          {...register("email", { required: true })}
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 10 caracteres"
          minLength={10}
          {...register("password", { required: true })}
        />
      </label>
      {msg && <div className={s.message}>{msg}</div>}
      {error && <div className={s.error}>{error}</div>}
      <button disabled={busy}>Crear cuenta</button>
    </form>
  );
}
