/**
 * TIGERTRACK AI — Auth API client
 * Thin wrapper around the local FastAPI auth endpoints.
 * Attaches X-Session-Token header from sessionStorage on every request.
 */

const API_BASE = "http://127.0.0.1:8000";

function sessionToken(): string | null {
  return sessionStorage.getItem("tt_session_token");
}

function authHeaders(): HeadersInit {
  const token = sessionToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["X-Session-Token"] = token;
  return headers;
}

async function apiCall<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json() as T;
}

export interface WorkstationStatus {
  configured: boolean;
  officer_count: number;
  workstation_id: string | null;
  reserve_name: string | null;
}

export interface LoginResponse {
  session_token: string;
  officer_id: string;
  display_name: string;
  role: string;
  expires_at: string;
  workstation_id: string | null;
}

export interface MeResponse {
  officer_id: string;
  display_name: string;
  role: string;
  is_admin: boolean;
  workstation_id: string | null;
}

export interface SetupResponse {
  workstation_id: string;
  officer_id: string;
  role: string;
  recovery_code: string;
  message: string;
}

export const authApi = {
  async status(): Promise<WorkstationStatus> {
    return apiCall<WorkstationStatus>("GET", "/api/auth/status");
  },

  async setup(
    officerId: string,
    displayName: string,
    password: string,
    reserveName?: string
  ): Promise<SetupResponse> {
    return apiCall<SetupResponse>("POST", "/api/auth/setup", {
      officer_id: officerId,
      display_name: displayName,
      password,
      reserve_name: reserveName ?? "Pench Tiger Reserve",
    });
  },

  async login(officerId: string, password: string): Promise<LoginResponse> {
    return apiCall<LoginResponse>("POST", "/api/auth/login", {
      officer_id: officerId,
      password,
    });
  },

  async logout(): Promise<void> {
    await apiCall<{ message: string }>("POST", "/api/auth/logout").catch(() => {
      // Ignore errors on logout — we clear the session regardless
    });
  },

  async me(): Promise<MeResponse> {
    return apiCall<MeResponse>("GET", "/api/auth/me");
  },

  async createOfficer(
    officerId: string,
    displayName: string,
    password: string,
    role: "ADMIN" | "OFFICER" | "SUPERVISOR" = "OFFICER"
  ): Promise<unknown> {
    return apiCall("POST", "/api/auth/officers", {
      officer_id: officerId,
      display_name: displayName,
      password,
      role,
    });
  },

  async listOfficers(): Promise<{ officers: unknown[] }> {
    return apiCall("GET", "/api/auth/officers");
  },
};
