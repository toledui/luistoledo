import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/blog-server";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/checkout",
        "/carrito",
        "/mi-cuenta",
        "/mi-aprendizaje",
        "/aprender/",
        "/login",
        "/registro",
        "/recuperar-contrasena",
        "/restablecer-contrasena",
        "/verificar-email",
        "/certificados/",
      ],
    },
    sitemap: siteUrl("/sitemap.xml"),
  };
}
