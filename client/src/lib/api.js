// Base URL: in dev we use the Vite proxy ("/api"); in production set
// VITE_API_URL to the Render API origin (e.g. https://api.doozy.andrewfbutler.com).
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const TOKEN_KEY = "doozy_token";

export const auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY) || "";
  },
  set token(v) {
    if (v) localStorage.setItem(TOKEN_KEY, v);
    else localStorage.removeItem(TOKEN_KEY);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    auth.clear();
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  login: (password) => request("POST", "/login", { password }),

  listTasks: () => request("GET", "/tasks"),
  createTask: (task) => request("POST", "/tasks", task),
  updateTask: (id, updates) => request("PATCH", `/tasks/${id}`, updates),
  toggleTask: (id) => request("POST", `/tasks/${id}/toggle`),
  toggleSubtask: (id, subId) =>
    request("POST", `/tasks/${id}/subtasks/${subId}/toggle`),
  reorderTasks: (ids) => request("PUT", "/tasks/reorder", { ids }),
  deleteTask: (id) => request("DELETE", `/tasks/${id}`),
  clearCompleted: () => request("DELETE", "/tasks/completed"),
  remindNow: (id) => request("POST", `/tasks/${id}/remind-now`),

  getSettings: () => request("GET", "/settings"),
  updateSettings: (s) => request("PUT", "/settings", s),
  testSms: () => request("POST", "/settings/test-sms"),

  pushPublicKey: () => request("GET", "/push/public-key"),
  pushSubscribe: (sub) => request("POST", "/push/subscribe", sub),
  pushUnsubscribe: (endpoint) => request("POST", "/push/unsubscribe", { endpoint }),
  testPush: () => request("POST", "/push/test"),
};
