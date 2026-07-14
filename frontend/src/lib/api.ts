const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request(path: string, init?: RequestInit) {
  return fetch(`${apiUrl}${path}`, { ...init, credentials: "include" });
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
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      response.status,
      "El servidor devolvió una respuesta con formato inválido",
    );
  }
}
