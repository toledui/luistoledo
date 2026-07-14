import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./home-page";
import { CartProvider } from "./cart/cart-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("HomePage", () => {
  it("presenta la propuesta principal de la academia", () => {
    render(
      <CartProvider>
        <HomePage />
      </CartProvider>,
    );
    expect(
      screen.getByRole("heading", {
        name: /convierte tu experiencia digital/i,
      }),
    ).toBeInTheDocument();
  });
});
