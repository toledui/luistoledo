import { NextResponse, type NextRequest } from "next/server";

// Resolve historical slugs before rendering/streaming so crawlers receive an actual HTTP 308.
export async function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.match(
    /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/,
  )?.[1];
  if (!slug) return NextResponse.next();
  const api = (
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"
  ).replace(/\/$/, "");
  try {
    const response = await fetch(
      `${api}/blog/redirects/${encodeURIComponent(slug)}`,
      { cache: "no-store", signal: AbortSignal.timeout(4000) },
    );
    if (response.ok) {
      const result = (await response.json()) as { redirectTo?: string | null };
      if (
        result.redirectTo &&
        /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.redirectTo)
      ) {
        const destination = request.nextUrl.clone();
        destination.pathname = result.redirectTo;
        return NextResponse.redirect(destination, 308);
      }
    }
  } catch {
    /* The page handles temporary API failures; do not invent a redirect. */
  }
  return NextResponse.next();
}
export const config = { matcher: "/blog/:slug" };
