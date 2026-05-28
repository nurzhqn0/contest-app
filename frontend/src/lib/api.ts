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
const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME || "student_contest_csrf";
const CSRF_HEADER_NAME = import.meta.env.VITE_CSRF_HEADER_NAME || "X-CSRF-Token";

export { API_BASE, WS_BASE };

type RequestOptions = RequestInit & {
  auth?: boolean;
  suppressUnauthorizedEvent?: boolean;
};

function readCookie(name: string) {
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")
      .slice(1)
      .join("=") ?? null
  );
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.body instanceof FormData) {
    headers.delete("Content-Type");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes((options.method || "GET").toUpperCase())) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, decodeURIComponent(csrfToken));
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    if (!options.suppressUnauthorizedEvent) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    throw new Error("Your session expired. Please sign in again.");
  }

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    throw new Error(errorBody.detail || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(
    path: string,
    auth = true,
    extra?: Omit<RequestOptions, "method" | "auth">,
  ) => request<T>(path, { method: "GET", auth, ...extra }),
  post: <T>(
    path: string,
    body: unknown,
    auth = true,
    extra?: Omit<RequestOptions, "method" | "body" | "auth">,
  ) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      auth,
      ...extra,
    }),
  put: <T>(
    path: string,
    body: unknown,
    auth = true,
    extra?: Omit<RequestOptions, "method" | "body" | "auth">,
  ) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      auth,
      ...extra,
    }),
  delete: (
    path: string,
    extra?: Omit<RequestOptions, "method">,
  ) => request<void>(path, { method: "DELETE", ...extra }),
  async download(path: string) {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
    });
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      throw new Error("Your session expired. Please sign in again.");
    }
    if (!response.ok) {
      throw new Error("The file could not be downloaded.");
    }
    const blob = await response.blob();
    const disposition =
      response.headers.get("Content-Disposition") ??
      "attachment; filename=export.xlsx";
    const filenameMatch = disposition.match(/filename="(.+)"/);
    const filename = filenameMatch?.[1] ?? "export.xlsx";
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  },
};
