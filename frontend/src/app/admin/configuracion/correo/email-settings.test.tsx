import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { EmailSettings } from "./email-settings";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("EmailSettings SMTP test", () => {
  it("shows the actual error beside the test button and refreshes the status after failure", async () => {
    let failed = false;
    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === "/admin/email/settings")
        return {
          provider: "SMTP",
          host: "smtp.example.invalid",
          port: 587,
          encryption: "STARTTLS",
          sslEnabled: false,
          tlsEnabled: true,
          fromName: "Academy",
          fromEmail: "sender@example.invalid",
          enabled: true,
          saveLogs: true,
          timeoutMs: 10000,
          maxRetries: 3,
          usernameConfigured: true,
          passwordConfigured: true,
        };
      if (path === "/admin/email/test") {
        failed = true;
        throw new Error("[EAUTH] Invalid login");
      }
      if (path === "/admin/email/status")
        return {
          provider: "SMTP",
          configured: true,
          enabled: true,
          sentToday: 0,
          failed: 0,
          pending: 0,
          lastErrorMessage: failed ? "[EAUTH] Invalid login" : undefined,
        };
      throw new Error("Unexpected request");
    });
    render(<EmailSettings />);
    const button = await screen.findByRole("button", { name: "Enviar prueba" });
    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "[EAUTH] Invalid login",
    );
    expect(await screen.findByText("Con errores")).toBeVisible();
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.filter(([path]) => path === "/admin/email/status"),
    ).toHaveLength(2);
  });
});
