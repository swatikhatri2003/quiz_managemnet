export type ApiOk<T> = { ok: true; data: T; message?: string };
export type ApiErr = {
  ok: false;
  error: { message: string; details?: unknown };
};

export type ApiResponse<T> = ApiOk<T> | ApiErr;

const DEFAULT_API_BASE_URL = "http://3.0.81.7/quizz";
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(
  /\/$/,
  ""
);

async function parseJsonSafe<T>(res: Response): Promise<ApiResponse<T>> {
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json) {
    return { ok: false, error: { message: `Invalid server response (${res.status}).` } };
  }
  return json;
}

export async function apiPost<T>(
  path: string,
  body: unknown
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });

  return await parseJsonSafe<T>(res);
}

export async function apiPostForm<T>(
  path: string,
  form: FormData
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  return await parseJsonSafe<T>(res);
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    cache: "no-store",
  });
  return await parseJsonSafe<T>(res);
}

