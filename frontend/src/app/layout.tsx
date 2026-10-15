import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { PublicBranding } from "@/components/public-branding";
import { CartProvider } from "@/components/cart/cart-context";
import { PublicShell } from "@/components/public-shell/public-shell";
import { ScrollToTop } from "@/components/scroll-to-top/scroll-to-top";
import { getSiteMetadata } from "@/lib/site-metadata";

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

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getSiteMetadata({ path: "/" });
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-MX"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <CartProvider>
          <ScrollToTop />
          <PublicBranding />
          <PublicShell>{children}</PublicShell>
        </CartProvider>
      </body>
    </html>
  );
}
