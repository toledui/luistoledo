"use client";
import { apiFetch } from "@/lib/api";
import { useState } from "react";
import { useForm } from "react-hook-form";
import s from "@/components/student-auth/student-auth.module.css";
export function ForgotForm() {
  const [msg, setMsg] = useState("");
  const { register, handleSubmit } = useForm<{ email: string }>();
  async function submit(v: { email: string }) {
    await apiFetch(
      "/auth/forgot-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      },
      false,
    );
    setMsg(
      "Si la cuenta existe, recibirás un correo con los siguientes pasos.",
    );
  }
  return (
    <form className={s.form} onSubmit={handleSubmit(submit)}>
      <label>
        Correo
        <input
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          {...register("email", { required: true })}
        />
      </label>
      {msg && <div className={s.message}>{msg}</div>}
      <button>Enviar instrucciones</button>
    </form>
  );
}
