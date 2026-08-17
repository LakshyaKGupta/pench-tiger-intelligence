/**
 * client.ts — Type-Safe Local Offline API Client for TIGERTRACK AI
 * Connects directly to local FastAPI server on http://127.0.0.1:8000
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorDetail = `HTTP ${res.status} ${res.statusText}`;
      let errorData = null;
      try {
        errorData = await res.json();
        if (errorData?.detail) {
          errorDetail = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // Non-JSON error payload
      }
      throw new ApiError(res.status, errorDetail, errorData);
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, err.message || "Failed to communicate with local TIGERTRACK API server");
  }
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) => {
    let query = "";
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          searchParams.append(k, String(v));
        }
      });
      const qs = searchParams.toString();
      if (qs) query = `?${qs}`;
    }
    return request<T>(`${endpoint}${query}`, { method: "GET" });
  },

  post: <T>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * Generates a safe image streaming URL from a relative path or absolute path.
   */
  getImageUrl: (relativePath?: string | null): string => {
    if (!relativePath) return "/placeholder-tiger.jpg";
    if (relativePath.startsWith("http://") || relativePath.startsWith("https://") || relativePath.startsWith("data:")) {
      return relativePath;
    }
    // Clean leading slashes
    const clean = relativePath.replace(/^(\.\/|\/)/, "");
    return `${API_BASE_URL}/images/serve/${clean}`;
  },
};
