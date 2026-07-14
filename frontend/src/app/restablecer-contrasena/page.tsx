import { AuthCard } from "@/components/student-auth/auth-card";
import { ResetForm } from "./reset-form";
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthCard
      eyebrow="Nueva contraseña"
      title="Recupera tu cuenta."
      description="El enlace solo puede utilizarse una vez."
    >
      <ResetForm token={token ?? ""} />
    </AuthCard>
  );
}
