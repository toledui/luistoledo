import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CourseEditor } from "./course-editor";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({ apiFetch }));

const course = {
  id: "course-1",
  title: "Curso de prueba",
  slug: "curso-de-prueba",
  status: "DRAFT",
  level: "BEGINNER",
  language: "es",
  price: 100,
  estimatedMinutes: 60,
  featured: false,
  sections: [
    {
      id: "section-1",
      title: "Módulo uno",
      position: 0,
      lessons: [
        {
          id: "lesson-1",
          title: "Lección uno",
          type: "TEXT",
          content: "",
          durationMinutes: 10,
          position: 0,
          isPreview: false,
          isPublished: true,
        },
        {
          id: "lesson-2",
          title: "Lección dos",
          type: "TEXT",
          content: "",
          durationMinutes: 10,
          position: 1,
          isPreview: false,
          isPublished: true,
        },
      ],
    },
  ],
};

describe("CourseEditor", () => {
  afterEach(cleanup);

  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockImplementation((path: string) => {
      if (path === "/admin/courses/course-1")
        return Promise.resolve(structuredClone(course));
      if (path === "/admin/courses/metadata")
        return Promise.resolve({
          categories: [],
          images: [],
          media: [],
          instructors: [],
        });
      if (path === "/admin/courses/course-1/enrollments")
        return Promise.resolve([]);
      if (path === "/admin/media/upload")
        return Promise.resolve({
          id: "media-1",
          name: "Guía visual",
          kind: "IMAGE",
          url: "https://cdn.test/guia.png",
        });
      return Promise.resolve({ reordered: true });
    });
  });

  it("permite subir una lección y persiste el nuevo orden", async () => {
    render(<CourseEditor id="course-1" />);

    await screen.findByRole("heading", { name: "Curso de prueba" });
    fireEvent.click(screen.getByRole("button", { name: /Temario/ }));
    fireEvent.click(screen.getByRole("button", { name: "Subir Lección dos" }));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/admin/courses/sections/section-1/lessons/reorder",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ lessonIds: ["lesson-2", "lesson-1"] }),
        }),
      ),
    );

    const lessonTwo = screen.getByDisplayValue("Lección dos");
    const lessonOne = screen.getByDisplayValue("Lección uno");
    expect(
      lessonTwo.compareDocumentPosition(lessonOne) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      await screen.findByText("Orden de las lecciones guardado."),
    ).toBeInTheDocument();
  });

  it("agrega enlaces y archivos como recursos adicionales", async () => {
    render(<CourseEditor id="course-1" />);

    await screen.findByRole("heading", { name: "Curso de prueba" });
    fireEvent.click(screen.getByRole("button", { name: /Temario/ }));
    fireEvent.change(
      screen.getByLabelText("Nombre del enlace de Lección uno"),
      { target: { value: "Documentación" } },
    );
    fireEvent.change(
      screen.getByLabelText("URL del recurso de Lección uno"),
      { target: { value: "https://example.com/docs" } },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Agregar enlace" })[0],
    );

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/admin/courses/lessons/lesson-1/resources",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "Documentación",
            url: "https://example.com/docs",
          }),
        }),
      ),
    );

    const image = new File(["image"], "guia.png", { type: "image/png" });
    fireEvent.change(screen.getAllByLabelText("Subir PDF o imagen")[0], {
      target: { files: [image] },
    });

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/admin/courses/lessons/lesson-1/resources",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "Guía visual",
            mediaId: "media-1",
          }),
        }),
      ),
    );
  });
});
