import type { Metadata } from "next";
import { MediaLibrary } from "./media-library";

export const metadata: Metadata = { title: "Biblioteca de medios" };
export default function MediaPage() {
  return <MediaLibrary />;
}
