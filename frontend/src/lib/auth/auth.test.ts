import { describe, it, expect, vi, beforeEach } from "vitest";
import { authApi } from "./api";

describe("Frontend Auth API Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear storage mock
    const store: Record<string, string> = {};
    global.sessionStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
      key: (i: number) => Object.keys(store)[i] ?? null,
      length: Object.keys(store).length,
    };
  });

  it("status() returns workstation configuration state", async () => {
    const mockStatus = {
      configured: true,
      officer_count: 3,
      workstation_id: "TT-PENCH-A1B2",
      reserve_name: "Pench Tiger Reserve",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStatus,
    } as any);

    const res = await authApi.status();
    expect(res.configured).toBe(true);
    expect(res.officer_count).toBe(3);
    expect(res.workstation_id).toBe("TT-PENCH-A1B2");
  });

  it("login() returns session token and officer profile", async () => {
    const mockLogin = {
      session_token: "test-token-abcdef-1234567890",
      officer_id: "RFO-PATIL",
      display_name: "Ramesh Patil",
      role: "OFFICER",
      expires_at: "2026-08-18T03:00:00Z",
      workstation_id: "TT-PENCH-A1B2",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLogin,
    } as any);

    const res = await authApi.login("RFO-PATIL", "ValidPassword123!");
    expect(res.session_token).toBe("test-token-abcdef-1234567890");
    expect(res.role).toBe("OFFICER");
  });

  it("handles 401 invalid credentials with clean error message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Invalid credentials. 4 attempt(s) remaining." }),
    } as any);

    await expect(authApi.login("RFO-PATIL", "WrongPassword")).rejects.toThrow(
      "Invalid credentials. 4 attempt(s) remaining."
    );
  });

  it("handles 429 account lockout cleanly", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ detail: "Account temporarily locked due to failed attempts." }),
    } as any);

    await expect(authApi.login("RFO-PATIL", "WrongPassword")).rejects.toThrow(
      "Account temporarily locked due to failed attempts."
    );
  });

  it("me() sends X-Session-Token header from sessionStorage", async () => {
    sessionStorage.setItem("tt_session_token", "active-officer-token");

    let capturedHeaders: any = null;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedHeaders = init?.headers;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          officer_id: "RFO-PATIL",
          display_name: "Ramesh Patil",
          role: "OFFICER",
          is_admin: false,
          workstation_id: "TT-PENCH-A1B2",
        }),
      });
    });

    const res = await authApi.me();
    expect(capturedHeaders["X-Session-Token"]).toBe("active-officer-token");
    expect(res.officer_id).toBe("RFO-PATIL");
  });
});
