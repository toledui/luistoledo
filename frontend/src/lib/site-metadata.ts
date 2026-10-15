import type { Metadata } from "next";

export type PublicSiteSettings = {
  general?: { academyName?: string; defaultLocale?: string };
  branding?: {
    openGraphImageUrl?: string | null;
    primaryLogoUrl?: string | null;
    darkLogoUrl?: string | null;
    faviconUrl?: string | null;
  };
};

type PageMetadata = { title?: string; description?: string; path?: string };

function publicImage(value: string | null | undefined, base: URL) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim(), base);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function createSiteMetadata(
  settings: PublicSiteSettings = {},
  page: PageMetadata = {},
  appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
): Metadata {
  const base = new URL(appUrl);
  const name = settings.general?.academyName?.trim() || "Luis Toledo Academy";
  const title = page.title || name;
  const description =
    page.description ||
    "Aprende desarrollo web, marketing digital y ventas B2B con Luis Toledo. Explora cursos prácticos y masterclasses para aplicar lo aprendido en tu negocio.";
  const branding = settings.branding;
  const image = [
    branding?.openGraphImageUrl,
    branding?.primaryLogoUrl,
    branding?.darkLogoUrl,
  ]
    .map((value) => publicImage(value, base))
    .find(Boolean);
  const icon = publicImage(branding?.faviconUrl, base);
  return {
    metadataBase: base,
    title: page.title ? title : { default: name, template: `%s | ${name}` },
    description,
    ...(icon ? { icons: { icon } } : {}),
    openGraph: {
      title,
      description,
      siteName: name,
      locale: (settings.general?.defaultLocale || "es-MX").replaceAll("-", "_"),
      type: "website",
      ...(page.path ? { url: new URL(page.path, base) } : {}),
      ...(image ? { images: [{ url: image, alt: name }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [{ url: image, alt: name }] } : {}),
    },
  };
}

// Resolve branding on the server so crawlers receive the image without JavaScript.
export async function getSiteMetadata(
  page: PageMetadata = {},
): Promise<Metadata> {
  let settings: PublicSiteSettings = {};
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
    const response = await fetch(
      `${apiUrl.replace(/\/$/, "")}/settings/public`,
      {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(4000),
      },
    );
    if (response.ok) settings = (await response.json()) as PublicSiteSettings;
  } catch {
    // Keep pages available if the API is temporarily unreachable.
  }
  return createSiteMetadata(settings, page);
}
