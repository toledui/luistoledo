import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
afterEach(() => vi.unstubAllGlobals());
describe("Canonical blog redirects before streaming", () => {
  it("returns a permanent HTTP redirect and preserves campaign parameters", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ redirectTo: "/blog/nuevo" }),
        }),
    );
    const response = await proxy(
      new NextRequest(
        "https://academy.example/blog/anterior?utm_source=google",
      ),
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://academy.example/blog/nuevo?utm_source=google",
    );
  });
  it("does not turn an invalid backend redirect into an open redirect", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ redirectTo: "https://evil.example/" }),
        }),
    );
    const response = await proxy(
      new NextRequest("https://academy.example/blog/anterior"),
    );
    expect(response.headers.get("location")).toBeNull();
  });
  it("leaves category pages outside the alias lookup", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await proxy(
      new NextRequest("https://academy.example/blog/categoria/marketing"),
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
