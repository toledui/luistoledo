import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { MasterclassForm } from "./registration-form";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
const fetchMock = vi.mocked(apiFetch);
const group = "https://chat.whatsapp.com/Lom8zLWDGKe9RbqjMhjbN4";
const settings = { turnstileEnabled: false, registrationOpen: true };

function fill() {
  fireEvent.change(screen.getByLabelText("Nombre completo"), {
    target: { value: "Ana Prueba" },
  });
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "ana@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Número de WhatsApp"), {
    target: { value: "+52 55 1234 5678" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
}
describe("MasterclassForm", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.resetAllMocks();
    fetchMock.mockResolvedValueOnce(settings);
  });
  it("guarda los datos y muestra la invitación al grupo solo después de confirmar", async () => {
    fetchMock.mockResolvedValueOnce({ success: true, whatsappGroupUrl: group });
    render(<MasterclassForm />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /reservar mi lugar gratis/i }),
      ).toBeEnabled(),
    );
    expect(
      screen.queryByRole("link", { name: /unirme al grupo/i }),
    ).not.toBeInTheDocument();
    fill();
    fireEvent.click(
      screen.getByRole("button", { name: /reservar mi lugar gratis/i }),
    );
    expect(
      await screen.findByRole("heading", { name: /tu lugar está registrado/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /unirme al grupo/i }),
    ).toHaveAttribute("href", group);
    const request = fetchMock.mock.calls[1];
    expect(request[0]).toBe("/masterclass/registrations");
    expect(JSON.parse(request[1]!.body as string)).toEqual({
      name: "Ana Prueba",
      email: "ana@example.com",
      whatsapp: "+52 55 1234 5678",
      consent: true,
    });
  });
  it("conserva el formulario y no muestra confirmación si falla el guardado", async () => {
    fetchMock.mockRejectedValueOnce(new Error("No se pudo guardar"));
    render(<MasterclassForm />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /reservar mi lugar gratis/i }),
      ).toBeEnabled(),
    );
    fill();
    fireEvent.click(
      screen.getByRole("button", { name: /reservar mi lugar gratis/i }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo guardar",
    );
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Ana Prueba");
    expect(
      screen.queryByRole("link", { name: /unirme al grupo/i }),
    ).not.toBeInTheDocument();
  });
  it("impide el envío cuando el servidor cierra el registro", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({ ...settings, registrationOpen: false });
    render(<MasterclassForm />);
    expect(
      await screen.findByText(/el registro para esta sesión ha cerrado/i),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /reservar mi lugar gratis/i }),
    ).not.toBeInTheDocument();
  });
});
