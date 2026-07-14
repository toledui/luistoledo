"use client";

import { useEffect } from "react";

type PublicSettings = {
  general: { academyName: string; tagline?: string; defaultLocale: string };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    darkBackgroundColor: string;
    lightSurfaceColor: string;
    headingFont: string;
    bodyFont: string;
    faviconUrl?: string;
    borderRadius: number;
  };
};

export type BrandingSettings = PublicSettings["branding"];

export function applyBranding(branding: BrandingSettings) {
  const root = document.documentElement;
  root.style.setProperty("--primary", branding.primaryColor);
  root.style.setProperty("--primary-strong", branding.primaryColor);
  root.style.setProperty("--secondary", branding.secondaryColor);
  root.style.setProperty("--violet", branding.secondaryColor);
  root.style.setProperty("--accent", branding.accentColor);
  root.style.setProperty("--lime", branding.accentColor);
  root.style.setProperty("--bg", branding.darkBackgroundColor);
  root.style.setProperty("--bg-soft", branding.darkBackgroundColor);
  root.style.setProperty("--surface", branding.lightSurfaceColor);
  root.style.setProperty("--surface-soft", branding.lightSurfaceColor);
  root.style.setProperty("--admin-radius", `${branding.borderRadius}px`);
  root.style.setProperty(
    "--radius-sm",
    `${Math.max(4, branding.borderRadius * 0.65)}px`,
  );
  root.style.setProperty("--radius-md", `${branding.borderRadius}px`);
  root.style.setProperty("--radius-lg", `${branding.borderRadius * 1.45}px`);
  root.style.setProperty("--heading-font", branding.headingFont);
  root.style.setProperty("--body-font", branding.bodyFont);
  if (branding.faviconUrl) {
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = branding.faviconUrl;
  }
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function PublicBranding() {
  useEffect(() => {
    fetch(`${apiUrl}/settings/public`)
      .then((response) =>
        response.ok
          ? (response.json() as Promise<PublicSettings>)
          : Promise.reject(),
      )
      .then(({ general, branding }) => {
        document.documentElement.lang = general.defaultLocale;
        applyBranding(branding);
        document.title = general.academyName;
      })
      .catch(() => undefined);
  }, []);
  return null;
}
