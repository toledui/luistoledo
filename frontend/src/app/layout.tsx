import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { PublicBranding } from "@/components/public-branding";
import { CartProvider } from "@/components/cart/cart-context";
import { PublicNavbar } from "@/components/public-navbar/public-navbar";
import { SiteFooter } from "@/components/site-footer/site-footer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

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
    <html lang="es-MX" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <CartProvider>
          <PublicBranding />
          <PublicNavbar />
          {children}
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
