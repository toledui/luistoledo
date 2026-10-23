const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
import { analyticsHeaders, confirmedBrowserEvent } from "./analytics";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (
    typeof window !== "undefined" &&
    init?.method &&
    !["GET", "HEAD"].includes(init.method) &&
    !path.startsWith("/admin") &&
    !path.startsWith("/analytics")
    && path !== "/payments/currency-quote"
  ) {
    const tracking = await analyticsHeaders().catch(() => ({}));
    for (const [key, value] of Object.entries(tracking))
      headers.set(key, value);
  }
  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  retry = true,
): Promise<T> {
  let response = await request(path, init);
  if (response.status === 401 && retry && path !== "/auth/refresh") {
    const refreshed = await request("/auth/refresh", { method: "POST" });
    if (refreshed.ok) response = await request(path, init);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(". ")
      : body?.message;
    throw new ApiError(
      response.status,
      message ?? "No fue posible completar la solicitud",
    );
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text.trim()) return undefined as T;
  try {
    const result = JSON.parse(text) as T;
    if (typeof window !== "undefined") confirmedBrowserEvent(result);
    return result;
  } catch {
    throw new ApiError(
      response.status,
      "El servidor devolvió una respuesta con formato inválido",
    );
  }
}
