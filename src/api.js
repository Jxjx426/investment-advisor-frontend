const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "/api"
    : "https://investment-advisor-backend-1p35.onrender.com");
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
export async function request(path, options = {}) {
  const res = await apiFetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res
    .json()
    .catch(() => ({ error: "The server returned an unexpected response." }));
  if (res.status === 401 && path !== "/auth/login") {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("session-expired"));
  }
  if (!res.ok)
    throw new Error(data.error || "Request failed. Please try again.");
  return data;
}
