import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyticsHeaders,
  initializeAnalytics,
  publicPath,
  readConsent,
  setConsent,
  trackEvent,
  trackPage,
} from "./analytics";
const configuration = {
  enabled: true,
  gaMeasurementId: "G-TEST",
  metaPixelId: "123456",
  consentVersion: "2026-10-21.2",
};
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.head.innerHTML = "";
  history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  delete window.gtag;
  delete window.fbq;
  delete window._fbq;
  window.dataLayer = [];
});
afterEach(() => vi.unstubAllGlobals());
describe("Consent-gated analytics", () => {
  it("asks for a new choice when the saved consent belongs to the previous notice", async () => {
    localStorage.setItem(
      "lta_consent_v1",
      JSON.stringify({
        analytics: true,
        advertising: true,
        version: "2026-10-21",
        at: Date.now(),
      }),
    );
    await initializeAnalytics(configuration);
    expect(readConsent()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(document.querySelector("script")).toBeNull();
  });
  it("loads no vendor scripts and sends no telemetry before consent", async () => {
    await initializeAnalytics(configuration);
    await trackEvent("page_view");
    expect(fetch).not.toHaveBeenCalled();
    expect(document.querySelector("script")).toBeNull();
    expect(await analyticsHeaders()).toEqual({});
  });
  it("retains no query or token fragments in analytics paths", () => {
    expect(publicPath("/checkout/exito?session_id=secret#private")).toBe(
      "/checkout/exito",
    );
    expect(publicPath("/certificados/verificar/private")).toBe(
      "/certificados/verificar/[code]",
    );
  });
  it("records one page view for repeated effects, and another for a navigation", async () => {
    localStorage.setItem(
      "lta_consent_v1",
      JSON.stringify({
        analytics: true,
        advertising: false,
        version: "2026-10-21.2",
        at: Date.now(),
      }),
    );
    await initializeAnalytics({
      enabled: true,
      consentVersion: "2026-10-21.2",
    });
    trackPage();
    trackPage();
    await new Promise((resolve) => setTimeout(resolve, 30));
    history.pushState(null, "", "/cursos");
    trackPage();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const events = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => String(url).endsWith("/events"));
    expect(events).toHaveLength(2);
    expect(document.getElementById("lta-meta")).toBeNull();
  });
  it("revokes the server session and prevents further event capture", async () => {
    localStorage.setItem(
      "lta_consent_v1",
      JSON.stringify({
        analytics: true,
        advertising: false,
        version: "2026-10-21.2",
        at: Date.now(),
      }),
    );
    await initializeAnalytics({
      enabled: true,
      consentVersion: "2026-10-21.2",
    });
    await setConsent(false, false);
    const before = vi.mocked(fetch).mock.calls.length;
    await trackEvent("add_to_cart", { value: 100 });
    expect(fetch).toHaveBeenCalledTimes(before);
    expect(readConsent()?.analytics).toBe(false);
    const calls = vi.mocked(fetch).mock.calls;
    const revoked = calls.some(([, init]) => {
      const data = JSON.parse(init?.body as string);
      return (
        data.analyticsConsent === false && data.advertisingConsent === false
      );
    });
    expect(revoked).toBe(true);
  });
  it("does not collect events in the administrator panel", async () => {
    history.replaceState(null, "", "/admin/analitica");
    localStorage.setItem(
      "lta_consent_v1",
      JSON.stringify({
        analytics: true,
        advertising: true,
        version: "2026-10-21.2",
        at: Date.now(),
      }),
    );
    await initializeAnalytics(configuration);
    await trackEvent("page_view");
    expect(fetch).not.toHaveBeenCalled();
    expect(document.querySelector("script")).toBeNull();
  });
});
