import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookiePreferences } from "./cookie-preferences";
import { AnalyticsProvider } from "./analytics-provider";
import { readConsent, setConsent, initializeAnalytics } from "@/lib/analytics";
vi.mock("next/navigation", () => ({
  usePathname: () => "/politica-de-cookies",
}));
vi.mock("@/lib/analytics", () => ({
  readConsent: vi.fn(),
  setConsent: vi.fn(),
  initializeAnalytics: vi.fn(),
  trackPage: vi.fn(),
  trackEvent: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(readConsent).mockReset().mockReturnValue(null);
  vi.mocked(setConsent).mockReset().mockResolvedValue(undefined);
  vi.mocked(initializeAnalytics).mockReset().mockResolvedValue(undefined);
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ enabled: true, consentVersion: "2026-10-21.2" }),
      }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Cookie preferences without a floating button", () => {
  it("starts with optional categories unchecked and saves only the selected category", async () => {
    render(<CookiePreferences />);
    const analytics = screen.getByRole("checkbox", { name: /Analítica:/ });
    const advertising = screen.getByRole("checkbox", { name: /Publicidad:/ });
    await waitFor(() => expect(analytics).toBeEnabled());
    expect(analytics).not.toBeChecked();
    expect(advertising).not.toBeChecked();
    fireEvent.click(analytics);
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar preferencias" }),
    );
    await waitFor(() => expect(setConsent).toHaveBeenCalledWith(true, false));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Preferencias guardadas",
    );
    fireEvent.click(screen.getByRole("button", { name: "Solo necesarias" }));
    await waitFor(() =>
      expect(setConsent).toHaveBeenLastCalledWith(false, false),
    );
  });
  it("keeps the initial consent choice and closes it when preferences are saved on the policy page", async () => {
    render(<AnalyticsProvider />);
    await screen.findByRole("dialog");
    expect(
      screen.queryByRole("button", { name: "Privacidad y cookies" }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: "Aviso de privacidad" }),
    ).toHaveAttribute("href", "/aviso-de-privacidad");
    expect(
      screen.getByRole("checkbox", { name: "Analítica" }),
    ).not.toBeChecked();
    window.dispatchEvent(new Event("lta:consent"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
