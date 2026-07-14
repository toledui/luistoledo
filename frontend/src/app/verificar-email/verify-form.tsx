"use client";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useState } from "react";
import s from "@/components/student-auth/student-auth.module.css";
export function VerifyForm({ token }: { token: string }) {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  async function verify() {
    try {
      await apiFetch(
        "/auth/verify-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        },
        false,
      );
      setMsg("Correo verificado. Ya puedes iniciar sesión.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible verificar.");
    }
  }
  return (
    <div className={s.form}>
      {msg ? (
        <>
          <div className={s.message}>{msg}</div>
          <Link href="/login">Ir al inicio de sesión</Link>
        </>
      ) : (
        <button onClick={verify} disabled={!token}>
          Verificar correo
        </button>
      )}
      {error && <div className={s.error}>{error}</div>}
    </div>
  );
}
