const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export type ApiError = { detail?: string; [key: string]: unknown };

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("biztrack_access");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("biztrack_access", access);
  localStorage.setItem("biztrack_refresh", refresh);
}

export function clearTokens() {
  localStorage.removeItem("biztrack_access");
  localStorage.removeItem("biztrack_refresh");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiError;
    const message =
      body.detail ??
      (Object.values(body).flat().join(", ") || `Request failed (${res.status})`);
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}