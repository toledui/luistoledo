import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { CheckoutView } from "./checkout-view";
const { push, clear } = vi.hoisted(() => ({ push: vi.fn(), clear: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock("@/components/cart/cart-context", () => ({
  useCart: () => ({ items: [], total: 0, clear, remove: vi.fn() }),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const offer = {
  title: "Implementa tu Propio Asistente de IA 24/7",
  registrationOpen: true,
  cashPrice: 1790,
  deposit: 500,
  installmentAmount: 990,
  installmentTotal: 2480,
};
function mockApi(open = true) {
  vi.mocked(apiFetch).mockImplementation(async (path) => {
    if (path === "/payments/methods")
      return { stripeEnabled: false, bankTransferEnabled: true };
    if (path === "/auth/me")
      return { firstName: "Ana", lastName: "Prueba", email: "ana@example.com" };
    if (path === "/paid-course") return { ...offer, registrationOpen: open };
    if (path === "/checkout") return { order: { id: "deposit" } };
    throw new Error(`Unexpected route ${path}`);
  });
}
describe("Live course checkout using the existing account flow", () => {
  it("charges only the $500 deposit, discloses the total and leaves the regular cart intact", async () => {
    mockApi();
    render(<CheckoutView program plan="INSTALLMENTS" />);
    const button = await screen.findByRole("button", {
      name: "Generar referencia",
    });
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByText(/Total del programa/)).toHaveTextContent(
      "$2,480 MXN",
    );
    expect(screen.getByText(/Hoy pagas/)).toHaveTextContent("$500 MXN");
    fireEvent.click(button);
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/checkout/pendiente?order=deposit"),
    );
    const checkout = vi
      .mocked(apiFetch)
      .mock.calls.find(([path]) => path === "/checkout");
    expect(JSON.parse(checkout![1]!.body as string)).toEqual({
      program: "asistente-ia",
      paymentOption: "INSTALLMENTS",
      paymentMethod: "BANK_TRANSFER",
    });
    expect(clear).not.toHaveBeenCalled();
    expect(
      vi.mocked(apiFetch).mock.calls.some(([path]) => path === "/cart"),
    ).toBe(false);
  });
  it("offers a single cash payment and disables enrollment after the closing date", async () => {
    mockApi(false);
    render(<CheckoutView program plan="FULL" />);
    expect(await screen.findByText(/Un solo pago de/)).toHaveTextContent(
      "$1,790 MXN",
    );
    expect(
      screen.getByRole("button", { name: "Generar referencia" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "inscripciones están cerradas",
    );
  });
});
