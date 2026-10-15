import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { ApiKeys } from "./api-keys";
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
describe("API key settings", () => {
  it("creates with read scopes, shows the secret once, and revokes the key", async () => {
    const token = `lta_${"a".repeat(64)}`;
    vi.mocked(apiFetch).mockImplementation(async (_path, init) => {
      if (!init) return [];
      if (init.method === "POST" && _path.endsWith("/revoke")) return { revoked: true };
      return { id: "key", name: "Hermes", prefix: "lta_aaaaaaaa", scopes: ["masterclass:read"], expiresAt: null, revokedAt: null, lastUsedAt: null, token };
    });
    render(<ApiKeys />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Crear clave" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Crear clave" }));
    expect(await screen.findByText(token)).toBeVisible();
    const createCall = vi.mocked(apiFetch).mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(createCall![1]!.body as string).scopes).toEqual(["masterclass:read", "courses.manage:read", "orders.manage:read"]);
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));
    expect(screen.queryByText(token)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revocar" }));
    expect(await screen.findByText(/Revocada/)).toBeVisible();
    expect(apiFetch).toHaveBeenCalledWith("/admin/settings/api-keys/key/revoke", { method: "POST" });
  });
});
