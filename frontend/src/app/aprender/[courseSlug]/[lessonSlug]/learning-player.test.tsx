import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningPlayer } from "./learning-player";

const apiFetch = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({ apiFetch }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("LearningPlayer", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    replace.mockReset();
    apiFetch.mockImplementation((path: string) => {
      if (path === "/learning/courses/curso-prueba")
        return Promise.resolve({
          title: "Curso de prueba",
          slug: "curso-prueba",
          sections: [
            {
              id: "section-1",
              title: "Módulo uno",
              lessons: [
                {
                  id: "lesson-1",
                  title: "Lección con recursos",
                  type: "TEXT",
                  content: "Contenido",
                  durationMinutes: 10,
                  resources: [
                    {
                      id: "resource-1",
                      title: "Guía en PDF",
                      kind: "DOCUMENT",
                      media: { name: "Guía", url: "https://cdn.test/guia.pdf" },
                    },
                    {
                      id: "resource-2",
                      title: "Sitio recomendado",
                      kind: "LINK",
                      url: "https://example.com/recurso",
                    },
                  ],
                },
              ],
            },
          ],
          lessonProgress: [],
          courseProgress: { percentage: 0 },
        });
      return Promise.resolve(undefined);
    });
  });

  it("despliega todos los recursos y los abre en una pestaña nueva", async () => {
    render(
      <LearningPlayer
        courseSlug="curso-prueba"
        initialLessonId="lesson-1"
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Ver recursos de Lección con recursos",
      }),
    );

    const pdf = screen.getByRole("menuitem", { name: /Guía en PDF/ });
    const link = screen.getByRole("menuitem", { name: /Sitio recomendado/ });
    expect(pdf).toHaveAttribute("href", "https://cdn.test/guia.pdf");
    expect(link).toHaveAttribute("href", "https://example.com/recurso");
    expect(pdf).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
