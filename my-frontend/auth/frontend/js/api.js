// Central place that knows the backend's base URL and wraps fetch()
// with JSON handling + automatic Authorization header injection.
// Every other JS file calls window.api.* instead of using fetch directly.

const API_BASE_URL = "http://localhost:5001"; // change this if your backend runs elsewhere

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = window.authStore.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    // The backend is probably not running / unreachable
    throw new Error("Cannot reach the server. Is the Auth Service running?");
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    data = null;
  }

  if (!response.ok) {
    const message = (data && data.message) || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

window.api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  logout: () => request("/auth/logout", { method: "POST", auth: true }),
  me: () => request("/auth/me", { method: "GET", auth: true }),
  getUser: (id) => request(`/users/${id}`, { method: "GET", auth: true }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: "PUT", body: payload, auth: true }),
};
