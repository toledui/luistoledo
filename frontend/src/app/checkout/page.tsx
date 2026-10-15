import { CheckoutView } from "./checkout-view";
export const metadata = { robots: { index: false, follow: false } };
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string; plan?: string }>;
}) {
  const params = await searchParams;
  return (
    <CheckoutView
      program={params.program === "asistente-ia"}
      plan={params.plan === "INSTALLMENTS" ? "INSTALLMENTS" : "FULL"}
    />
  );
}
