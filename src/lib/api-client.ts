export type ApiResult<T> = { ok: boolean; status: number; data: T & { error?: string; errors?: Record<string, string> } };

export async function api<T = Record<string, unknown>>(path: string, method = "GET", body?: unknown): Promise<ApiResult<T>> {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as ApiResult<T>["data"];
  return { ok: response.ok, status: response.status, data };
}
