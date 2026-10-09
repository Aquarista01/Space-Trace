export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, init = {}) {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }

  return res.json();
}

export const getMe = () => api("/users/me");
export const logout = () => api("/auth/logout", { method: "POST" });
export const googleLoginUrl = `${API_URL}/api/v1/auth/google/login`;
