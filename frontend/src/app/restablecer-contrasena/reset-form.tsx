"use client";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import s from "@/components/student-auth/student-auth.module.css";
export function ResetForm({ token }: { token: string }) {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const { register, handleSubmit } = useForm<{ password: string }>();
  async function submit(v: { password: string }) {
    try {
      await apiFetch(
        "/auth/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: v.password }),
        },
        false,
      );
      setMsg(
        "Contraseña actualizada. Todas las sesiones anteriores fueron cerradas.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No fue posible restablecerla.",
      );
    }
  }
  return (
    <form className={s.form} onSubmit={handleSubmit(submit)}>
      {msg ? (
        <>
          <div className={s.message}>{msg}</div>
          <Link href="/login">Iniciar sesión</Link>
        </>
      ) : (
        <>
          <label>
            Nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 10 caracteres"
              minLength={10}
              {...register("password", { required: true })}
            />
          </label>
          <button disabled={!token}>Actualizar contraseña</button>
        </>
      )}
      {error && <div className={s.error}>{error}</div>}
    </form>
  );
}
