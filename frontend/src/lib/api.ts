import { clearToken, getToken } from "./auth";

function defaultApiBase() {
  const { protocol, hostname, port } = window.location;
  if (port === "5173" || port === "4173") {
    return "http://localhost:8000/api/v1";
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ""}/api/v1`;
}

function defaultWsBase() {
  const { protocol, hostname, port } = window.location;
  if (port === "5173" || port === "4173") {
    return "ws://localhost:8000";
  }
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${hostname}${port ? `:${port}` : ""}`;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || defaultApiBase();
const WS_BASE = import.meta.env.VITE_WS_BASE_URL || defaultWsBase();

export { API_BASE, WS_BASE };

type RequestOptions = RequestInit & {
  auth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.auth !== false) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearToken();
    throw new Error("Your session expired. Please sign in again.");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errorBody.detail || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: "GET", auth }),
  post: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), auth }),
  put: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body), auth }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
  async download(path: string) {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}${path}`, { headers });
    if (!response.ok) {
      throw new Error("The file could not be downloaded.");
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") ?? "attachment; filename=export.xlsx";
    const filenameMatch = disposition.match(/filename="(.+)"/);
    const filename = filenameMatch?.[1] ?? "export.xlsx";
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
};
