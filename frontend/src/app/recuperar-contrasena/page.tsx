import { AuthCard } from "@/components/student-auth/auth-card";
import { ForgotForm } from "./forgot-form";
export default function ForgotPage() {
  return (
    <AuthCard
      eyebrow="Recuperar acceso"
      title="Restablece tu contraseña."
      description="Si existe una cuenta, enviaremos instrucciones al correo indicado."
    >
      <ForgotForm />
    </AuthCard>
  );
}
