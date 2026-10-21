import { beforeEach, describe, expect, it, vi } from "vitest";
const { fetchManifest } = vi.hoisted(() => ({ fetchManifest: vi.fn() }));
vi.mock("@/lib/blog-server", () => ({
  blogFetch: fetchManifest,
  siteUrl: (path: string) => `https://academy.example${path}`,
}));
import sitemap, { dynamic, revalidate } from "./sitemap";
beforeEach(() => vi.clearAllMocks());
describe("Automatically refreshed sitemap", () => {
  it("reads a fresh public manifest on every request, including newly published posts", async () => {
    fetchManifest
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { path: "/blog/nuevo-articulo", updatedAt: "2026-10-21T12:00:00Z" },
      ]);
    const before = await sitemap();
    expect(
      before.some((item) => item.url.endsWith("/aviso-de-privacidad")),
    ).toBe(true);
    expect(
      before.some((item) => item.url.endsWith("/politica-de-cookies")),
    ).toBe(true);
    expect(before.some((item) => item.url.endsWith("/privacidad"))).toBe(false);
    const after = await sitemap();
    expect(before.some((item) => item.url.includes("nuevo-articulo"))).toBe(
      false,
    );
    expect(
      after.find((item) => item.url.endsWith("/blog/nuevo-articulo"))
        ?.lastModified,
    ).toEqual(new Date("2026-10-21T12:00:00Z"));
    expect(fetchManifest).toHaveBeenCalledTimes(2);
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
  });
  it("omits private routes and propagates failures instead of returning a partial sitemap", async () => {
    fetchManifest.mockResolvedValueOnce([]);
    expect(
      (await sitemap()).some((item) =>
        /admin|checkout|carrito|mi-cuenta/.test(item.url),
      ),
    ).toBe(false);
    fetchManifest.mockRejectedValueOnce(new Error("unavailable"));
    await expect(sitemap()).rejects.toThrow("unavailable");
  });
});
