import { AuthCard } from "@/components/student-auth/auth-card";
import { VerifyForm } from "./verify-form";
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthCard
      eyebrow="Verificación"
      title="Confirma tu correo."
      description="Activa tu cuenta para comenzar a usar la academia."
    >
      <VerifyForm token={token ?? ""} />
    </AuthCard>
  );
}
