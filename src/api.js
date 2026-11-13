const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const LOCAL_PREVIEW = import.meta.env.DEV ||
  (typeof window !== "undefined" && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname));
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
  let res;
  try {
    res = await apiFetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error(LOCAL_PREVIEW
      ? 'Local preview is offline. Run npm run preview in Backend.'
      : 'Cannot reach the server. Please try again.');
  }
  const data = await res
    .json()
    .catch(() => ({ error: LOCAL_PREVIEW && res.status >= 500
      ? 'Local API is offline. Run npm run preview in Backend.'
      : 'The server returned an unexpected response.' }));
  if (res.status === 401 && path !== "/auth/login") {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("session-expired"));
  }
  if (!res.ok)
    throw new Error(data.error || "Request failed. Please try again.");
  return data;
}
