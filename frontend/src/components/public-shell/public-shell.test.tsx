import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicShell } from "./public-shell";

const route = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));

vi.mock("@/components/public-navbar/public-navbar", () => ({
  PublicNavbar: () => <nav data-testid="public-navbar" />,
}));

vi.mock("@/components/site-footer/site-footer", () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}));

describe("PublicShell", () => {
  afterEach(cleanup);

  beforeEach(() => {
    route.pathname = "/";
  });

  it("muestra la navegación y el footer en el sitio público", () => {
    render(<PublicShell><main>Contenido público</main></PublicShell>);

    expect(screen.getByTestId("public-navbar")).toBeInTheDocument();
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
  });

  it.each(["/admin", "/admin/cursos/curso-1"])(
    "oculta el chrome público en %s",
    (pathname) => {
      route.pathname = pathname;
      render(<PublicShell><main>Panel administrativo</main></PublicShell>);

      expect(screen.queryByTestId("public-navbar")).not.toBeInTheDocument();
      expect(screen.queryByTestId("site-footer")).not.toBeInTheDocument();
      expect(screen.getByText("Panel administrativo")).toBeInTheDocument();
    },
  );
});
