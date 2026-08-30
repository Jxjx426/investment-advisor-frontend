const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://investment-advisor-backend-1p35.onrender.com';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  return res;
}