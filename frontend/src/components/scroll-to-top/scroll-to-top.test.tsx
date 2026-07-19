import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollToTop } from "./scroll-to-top";

const route = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));

describe("ScrollToTop", () => {
  beforeEach(() => {
    route.pathname = "/";
    window.history.replaceState(null, "", "/");
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("reinicia el scroll al cambiar de pagina", () => {
    const view = render(<ScrollToTop />);

    route.pathname = "/cursos";
    act(() => view.rerender(<ScrollToTop />));

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  });

  it("conserva la navegacion hacia una seccion con hash", () => {
    const view = render(<ScrollToTop />);

    window.history.replaceState(null, "", "/cursos#temario");
    route.pathname = "/cursos";
    act(() => view.rerender(<ScrollToTop />));

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
