"use client";

/** Browser-side API client. Calls go through the Next.js BFF so the session token stays in an httpOnly cookie. */
export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;
  code?: string;
  data: Record<string, unknown>;
  constructor(status: number, data: Record<string, unknown>) {
    super((data?.message as string) || (status === 429 ? "Too many requests. Please wait and try again." : "Something went wrong. Please try again."));
    this.status = status;
    this.errors = (data?.errors as Record<string, string[]>) || {};
    this.code = data?.code as string | undefined;
    this.data = data || {};
  }
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }
}

type Body = Record<string, unknown> | FormData | undefined;

async function request<T>(method: string, path: string, body?: Body, base = "/api/backend"): Promise<T> {
  const init: RequestInit = { method, headers: { Accept: "application/json" }, credentials: "same-origin" };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(`${base}/${path.replace(/^\/+/, "")}`, init);
  } catch {
    throw new ApiError(0, { message: "You appear to be offline. Please check your internet connection." });
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("auth/me")) {
      window.dispatchEvent(new CustomEvent("sr:unauthorized"));
    }
    throw new ApiError(res.status, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: Body) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body?: Body) => request<T>("PUT", path, body ?? {}),
  del: <T>(path: string) => request<T>("DELETE", path),
  auth: <T>(action: string, body?: Body) => request<T>("POST", action, body ?? {}, "/api/auth"),
};

/** Build "?a=1&b[]=x" from a plain object (skips empty values). */
export function qs(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.filter((x) => x !== "" && x != null).forEach((x) => q.append(`${k}[]`, String(x)));
    else if (v !== undefined && v !== null && v !== "" && v !== false) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Trigger a file download from a BFF URL (CSV exports). */
export function download(path: string) {
  const a = document.createElement("a");
  a.href = `/api/backend/${path.replace(/^\/+/, "")}`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
