import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PostContent } from "./post-content";
afterEach(cleanup);
describe("Safe blog block rendering", () => {
  it("renders ordered content and escapes HTML instead of executing it", () => {
    const { container } = render(
      <PostContent
        blocks={[
          { id: "1", type: "heading", level: 2, text: "Guía práctica" },
          { id: "2", type: "paragraph", text: "<script>private()</script>" },
          {
            id: "3",
            type: "list",
            ordered: true,
            items: ["Primero", "Después"],
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Guía práctica",
    );
    expect(screen.getByText("<script>private()</script>")).toBeVisible();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("ol")?.children).toHaveLength(2);
  });
  it("does not render script links or arbitrary iframe hosts in previews", () => {
    const { container } = render(
      <PostContent
        blocks={[
          {
            id: "a",
            type: "button",
            url: "javascript:alert(1)",
            text: "Unsafe",
          },
          { id: "b", type: "video", url: "https://evil.example/video" },
        ]}
      />,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });
  it("supports accessible images and provider-specific video embeds", () => {
    render(
      <PostContent
        blocks={[
          {
            id: "a",
            type: "image",
            url: "https://example.com/photo.jpg",
            alt: "Descripción accesible",
          },
          {
            id: "b",
            type: "video",
            url: "https://youtu.be/dQw4w9WgXcQ",
            text: "Demostración",
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("img", { name: "Descripción accesible" }),
    ).toHaveAttribute("loading", "lazy");
    expect(screen.getByTitle("Demostración")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });
});
