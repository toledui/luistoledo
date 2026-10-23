import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import {
  CurrencyProvider,
  CurrencySelector,
  CurrencyPrice,
} from "./currency-context";
import { OrderCurrencyPayment } from "./order-currency-payment";
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
beforeEach(() => {
  localStorage.clear();
  vi.mocked(apiFetch).mockImplementation(async (path, init) => {
    if (path === "/payments/currencies")
      return {
        currencies: ["MXN", "USD", "EUR"],
        defaultCurrency: "USD",
        country: "US",
      };
    if (path === "/payments/currency-quote") {
      const value = JSON.parse(init!.body as string) as {
        currency: string;
        amountMxn: number;
      };
      return {
        base: value.amountMxn.toFixed(2),
        currency: value.currency,
        formatted: value.currency + " " + value.amountMxn,
        token: "signed-" + value.currency,
        exp: Date.now() + 600000,
      };
    }
    throw new Error("Unexpected route");
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
describe("Website currency selection", () => {
  it("limits choices to the Americas and EUR, replacing an excluded saved or detected currency", async () => {
    localStorage.setItem("lta_currency_v1", "JPY");
    vi.mocked(apiFetch).mockResolvedValue({
      currencies: ["MXN", "USD", "EUR", "CAD", "BRL", "ARS", "CLP", "COP", "PEN", "UYU", "PYG", "BOB", "CRC", "GTQ", "HNL", "NIO", "DOP", "JPY", "GBP", "CNY"],
      defaultCurrency: "JPY",
      country: "JP",
    });
    render(<CurrencyProvider><CurrencySelector /></CurrencyProvider>);
    const trigger = screen.getByRole("button", { name: "Moneda de pago: MXN" });
    await waitFor(() => expect(trigger).toBeEnabled());
    fireEvent.click(trigger);
    expect(screen.getAllByRole("option").map((option) => option.querySelector("strong")?.textContent)).toEqual([
      "MXN", "USD", "CAD", "BRL", "ARS", "CLP", "COP", "PEN", "UYU", "PYG", "BOB", "CRC", "GTQ", "HNL", "NIO", "DOP", "EUR",
    ]);
    expect(screen.queryByRole("option", { name: /JPY|GBP|CNY/ })).not.toBeInTheDocument();
  });
  it("defaults to the detected country, updates displayed prices and remembers manual selection", async () => {
    render(
      <CurrencyProvider>
        <CurrencySelector />
        <CurrencyPrice amount={501.23} />
      </CurrencyProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Moneda de pago: USD" })).toHaveTextContent("USD"),
    );
    expect(await screen.findByText("USD 501.23")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Moneda de pago: USD" }));
    fireEvent.click(screen.getByRole("option", { name: /EUR/ }));
    expect(await screen.findByText("EUR 501.23")).toBeInTheDocument();
    expect(localStorage.getItem("lta_currency_v1")).toBe("EUR");
  });
  it("prioritizes a saved choice over country detection", async () => {
    localStorage.setItem("lta_currency_v1", "MXN");
    render(
      <CurrencyProvider>
        <CurrencySelector />
        <CurrencyPrice amount={502.34} />
      </CurrencyProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Moneda de pago: MXN" })).toBeEnabled(),
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByText("$502.34 MXN")).toBeInTheDocument();
  });
  it("sends the selected signed quote when resuming a cancelled Stripe payment", async () => {
    const pay = vi.fn();
    render(
      <CurrencyProvider>
        <OrderCurrencyPayment amount={503.45} busy={false} onPay={pay} />
      </CurrencyProvider>,
    );
    await screen.findByText("USD 503.45");
    fireEvent.click(screen.getByRole("button", { name: "Completar pago" }));
    expect(pay).toHaveBeenCalledWith("signed-USD");
  });
  it("retains only MXN when foreign conversion is unavailable", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      currencies: ["MXN"],
      defaultCurrency: "MXN",
      country: null,
      unavailable: true,
    });
    render(
      <CurrencyProvider>
        <CurrencySelector />
      </CurrencyProvider>,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Moneda de pago: MXN" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Moneda de pago: MXN" }));
    expect(
      await screen.findByText("Conversión no disponible por el momento."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });
  it("shows only the code when closed and searches names without accents or by code", async () => {
    render(<CurrencyProvider><CurrencySelector /></CurrencyProvider>);
    const trigger = await screen.findByRole("button", { name: "Moneda de pago: USD" });
    expect(trigger).toHaveTextContent(/^USD$/);
    fireEvent.click(trigger);
    const search = screen.getByRole("combobox", { name: "Buscar moneda" });
    expect(search).toHaveFocus();
    fireEvent.change(search, { target: { value: "dolar" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: /USD.*dólar/i })).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "eur" } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(trigger).toHaveTextContent(/^EUR$/);
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
  it("supports arrow navigation, empty results, Escape and dismissal outside", async () => {
    render(<CurrencyProvider><CurrencySelector /><button>Fuera</button></CurrencyProvider>);
    const trigger = await screen.findByRole("button", { name: "Moneda de pago: USD" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    let search = screen.getByRole("combobox");
    fireEvent.change(search, { target: { value: "xyz" } });
    expect(screen.getByRole("status")).toHaveTextContent("No se encontraron monedas.");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(trigger).toHaveTextContent(/^USD$/);
    fireEvent.change(search, { target: { value: "" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(trigger).toHaveTextContent(/^EUR$/);
    fireEvent.click(trigger);
    search = screen.getByRole("combobox");
    fireEvent.keyDown(search, { key: "Escape" });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Fuera" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
