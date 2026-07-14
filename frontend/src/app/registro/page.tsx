import { AuthCard } from "@/components/student-auth/auth-card";
import Link from "next/link";
import { RegisterForm } from "./register-form";
export default function RegisterPage() {
  return (
    <AuthCard
      eyebrow="Crear cuenta"
      title="Comienza a aprender."
      description="Regístrate para acceder a cursos, progreso y certificados."
      footer={
        <>
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
