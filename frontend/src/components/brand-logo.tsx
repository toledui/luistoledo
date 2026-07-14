"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Branding = { primaryLogoUrl?: string | null; darkLogoUrl?: string | null };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
let request: Promise<Branding> | undefined;

function loadBranding() {
  request ??= fetch(`${apiUrl}/settings/public`)
    .then((response) => {
      if (!response.ok) throw new Error("No fue posible cargar el branding");
      return response.json() as Promise<{ branding: Branding }>;
    })
    .then(({ branding }) => branding)
    .catch((error) => {
      request = undefined;
      throw error;
    });
  return request;
}

export function BrandLogo({ dark = false }: { dark?: boolean }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    loadBranding()
      .then((branding) => setUrl(
        (dark
          ? branding.darkLogoUrl || branding.primaryLogoUrl
          : branding.primaryLogoUrl || branding.darkLogoUrl) || undefined,
      ))
      .catch(() => undefined);
  }, [dark]);
  if (!url) return <span>TH</span>;
  return (
    <Image
      src={url}
      alt="Luis Toledo Academy"
      width={42}
      height={42}
      quality={100}
      sizes="42px"
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}
