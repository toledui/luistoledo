import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "./contact-form";
import { apiFetch } from "@/lib/api";
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
const api = vi.mocked(apiFetch);
beforeEach(() => {
  api.mockReset();
  api.mockImplementation(async (path) =>
    path === "/contacts/settings"
      ? { turnstileEnabled: false }
      : { success: true },
  );
});
afterEach(cleanup);
describe("Preferencia de newsletter en contacto", () => {
  it.each([true, false])(
    "envía la preferencia explícita %s y permite enviar sin suscribirse",
    async (optIn) => {
      const { container } = render(<ContactForm />);
      const checkbox = screen.getByRole("checkbox", {
        name: /Quiero recibir el boletín/,
      });
      expect(checkbox).toBeChecked();
      if (!optIn) fireEvent.click(checkbox);
      fireEvent.change(screen.getByLabelText(/^Nombre/), {
        target: { value: "Persona de prueba" },
      });
      fireEvent.change(screen.getByLabelText(/^Correo/), {
        target: { value: "contact@example.invalid" },
      });
      fireEvent.change(screen.getByLabelText(/^Asunto/), {
        target: { value: "Consulta de prueba" },
      });
      fireEvent.change(screen.getByLabelText(/^Mensaje/), {
        target: { value: "Quisiera información del curso" },
      });
      fireEvent.submit(container.querySelector("form")!);
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: "Mensaje recibido" }),
        ).toBeVisible(),
      );
      const call = api.mock.calls.find(([path]) => path === "/contacts");
      expect(JSON.parse(call![1]!.body as string).newsletterOptIn).toBe(optIn);
    },
  );
});
