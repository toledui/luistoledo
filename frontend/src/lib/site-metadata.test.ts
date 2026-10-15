import { afterEach, describe, expect, it, vi } from "vitest";
import { createSiteMetadata, getSiteMetadata } from "./site-metadata";

const base = "https://luistoledo.com.mx";
const settings = {
  general: { academyName: "Mi academia", defaultLocale: "es-MX" },
  branding: {
    openGraphImageUrl: "/uploads/share.png",
    primaryLogoUrl: "/uploads/logo.png",
    darkLogoUrl: "/uploads/dark.png",
  },
};

afterEach(() => vi.unstubAllGlobals());
describe("Server share metadata", () => {
  it("loads branding from public settings on the server with a short cache", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => settings });
    vi.stubGlobal("fetch", fetchMock);
    const result = await getSiteMetadata();
    expect(result.openGraph).toMatchObject({ siteName: "Mi academia" });
    expect(result.openGraph).toHaveProperty("images");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/settings\/public$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      next: { revalidate: 60 },
    });
  });
  it("uses the configured sharing image, absolute URLs, site name and large Twitter card", () => {
    const result = createSiteMetadata(settings, {}, base);
    expect(result.openGraph).toMatchObject({
      siteName: "Mi academia",
      locale: "es_MX",
      images: [{ url: `${base}/uploads/share.png`, alt: "Mi academia" }],
    });
    expect(result.twitter).toMatchObject({
      card: "summary_large_image",
      images: [{ url: `${base}/uploads/share.png`, alt: "Mi academia" }],
    });
  });
  it("falls back to the main logo, then the dark logo, when no sharing image is configured", () => {
    expect(
      createSiteMetadata(
        { branding: { primaryLogoUrl: "/logo.png", darkLogoUrl: "/dark.png" } },
        {},
        base,
      ).openGraph,
    ).toMatchObject({ images: [{ url: `${base}/logo.png` }] });
    expect(
      createSiteMetadata(
        {
          branding: {
            openGraphImageUrl: "javascript:invalid",
            darkLogoUrl: "/dark.png",
          },
        },
        {},
        base,
      ).openGraph,
    ).toMatchObject({ images: [{ url: `${base}/dark.png` }] });
  });
  it("keeps the brand image and site name with masterclass-specific titles and description", () => {
    const result = createSiteMetadata(
      settings,
      {
        path: "/masterclass",
        title: "Masterclass gratuita",
        description: "Aprende IA para tu negocio",
      },
      base,
    );
    expect(result.openGraph).toMatchObject({
      title: "Masterclass gratuita",
      siteName: "Mi academia",
      description: "Aprende IA para tu negocio",
      images: [{ url: `${base}/uploads/share.png` }],
    });
    expect(result.openGraph).toHaveProperty(
      "url",
      new URL(`${base}/masterclass`),
    );
  });
  it("uses safe fallback metadata if the settings API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
    expect(await getSiteMetadata()).toMatchObject({
      title: { default: "Luis Toledo Academy" },
      twitter: { card: "summary_large_image" },
    });
  });
});
