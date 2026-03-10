/**
 * Lightweight API client for frontend. Centralizes base URL, JSON handling,
 * and optional auth. Use fetch() directly if you need custom behavior.
 */

const getBase = () => (typeof window !== "undefined" ? "" : process.env.NEXTAUTH_URL ?? "");

type ApiOptions = RequestInit & {
  /** If true, parse 401/403 as unauthorized and return null body (caller can redirect to signin). */
  handleAuth?: boolean;
};

async function request<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<{ data: T | null; response: Response; error?: string }> {
  const { handleAuth = true, ...init } = options;
  const url = path.startsWith("http") ? path : `${getBase()}${path}`;
  const isGet = (init.method ?? "GET").toUpperCase() === "GET";
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...(isGet ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  if (res.status === 401 || res.status === 403) {
    if (handleAuth) {
      return { data: null, response: res, error: "Unauthorized" };
    }
  }

  const text = await res.text();
  let data: T | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      return { data: null, response: res, error: "Invalid JSON" };
    }
  }

  if (!res.ok) {
    const err = (data as { error?: string })?.error ?? res.statusText;
    return { data: null, response: res, error: err };
  }

  return { data, response: res };
}

export const api = {
  get<T = unknown>(path: string, options?: ApiOptions) {
    return request<T>(path, { ...options, method: "GET" });
  },

  post<T = unknown>(path: string, body?: unknown, options?: ApiOptions) {
    return request<T>(path, { ...options, method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
  },

  put<T = unknown>(path: string, body?: unknown, options?: ApiOptions) {
    return request<T>(path, { ...options, method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined });
  },

  patch<T = unknown>(path: string, body?: unknown, options?: ApiOptions) {
    return request<T>(path, { ...options, method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });
  },

  delete<T = unknown>(path: string, options?: ApiOptions) {
    return request<T>(path, { ...options, method: "DELETE" });
  },
};
