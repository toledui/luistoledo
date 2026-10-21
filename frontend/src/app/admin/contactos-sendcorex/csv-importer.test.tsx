import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { CsvImporter } from "./csv-importer";
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
const api = vi.mocked(apiFetch);
beforeEach(() => api.mockReset());
afterEach(cleanup);
describe("CSV importer", () => {
  it("previews valid and invalid counts before importing the selected file", async () => {
    api
      .mockResolvedValueOnce({
        totalRows: 4,
        valid: 2,
        duplicates: 1,
        invalid: 1,
        sample: [{ name: "Ana", email: "ana@example.com" }],
        errors: [{ line: 4, message: "Correo inválido" }],
      })
      .mockResolvedValueOnce({ total: 2 });
    const imported = vi.fn();
    render(<CsvImporter onImported={imported} />);
    const file = new File(["email\nana@example.com"], "contacts.csv", {
      type: "text/csv",
    });
    fireEvent.change(screen.getByLabelText(/Archivo CSV/), {
      target: { files: [file] },
    });
    expect(screen.queryByRole("button", { name: /Importar 2/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Revisar archivo" }));
    await waitFor(() =>
      expect(screen.getByText(/1 filas inválidas/)).toBeVisible(),
    );
    expect(imported).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Importar 2 contactos válidos" }),
    );
    await waitFor(() => expect(imported).toHaveBeenCalledOnce());
    expect(api.mock.calls.map(([path]) => path)).toEqual([
      "/admin/sendcorex/imports/preview",
      "/admin/sendcorex/imports",
    ]);
    expect(api.mock.calls[1][1]?.body).toBeInstanceOf(FormData);
  });
  it("discards the preview when a different file is selected", async () => {
    api.mockResolvedValueOnce({
      totalRows: 1,
      valid: 1,
      duplicates: 0,
      invalid: 0,
      sample: [],
      errors: [],
    });
    render(<CsvImporter onImported={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Archivo CSV/), {
      target: { files: [new File(["email"], "one.csv")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Revisar archivo" }));
    await screen.findByRole("button", { name: "Importar 1 contactos válidos" });
    fireEvent.change(screen.getByLabelText(/Archivo CSV/), {
      target: { files: [new File(["email"], "two.csv")] },
    });
    expect(screen.queryByRole("button", { name: /Importar 1/ })).toBeNull();
  });
});
