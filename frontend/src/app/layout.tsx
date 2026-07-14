import type { Metadata } from "next";
import "./globals.css";
import { PublicBranding } from "@/components/public-branding";
import { CartProvider } from "@/components/cart/cart-context";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Luis Toledo Academy",
    template: "%s | Luis Toledo Academy",
  },
  description:
    "Cursos prácticos de desarrollo web, marketing digital y ventas B2B.",
  openGraph: { title: "Luis Toledo Academy", locale: "es_MX", type: "website" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>
        <CartProvider>
          <PublicBranding />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
