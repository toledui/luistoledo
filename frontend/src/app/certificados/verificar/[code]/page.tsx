import { CertificateVerification } from "./verification";

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <CertificateVerification code={code} />;
}
