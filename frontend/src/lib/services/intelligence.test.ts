import { describe, it, expect, vi, beforeEach } from "vitest";
import { intelligenceService } from "./index";
import { ApiError } from "../api/client";

describe("Frontend Intelligence Service & Data Invariants", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  describe("Empty Database Truth Invariants", () => {
    it("getOverview() on empty DB reports 0.0 confidence and null latestRun", async () => {
      const mockEmptyOverview = {
        total_tigers: 0,
        total_detections: 0,
        identification_confidence: 0.0,
        active_alerts: 0,
        camera_stations: 0,
        images_processed: 0,
        quarantined_count: 0,
        reviewed_count: 0,
        latest_ingestion_run: null,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockEmptyOverview,
      } as any);

      const res = await intelligenceService.getOverview();
      expect(res.total_tigers).toBe(0);
      expect(res.identification_confidence).toBe(0.0);
      expect(res.latest_ingestion_run).toBeNull();
    });

    it("getTigers() on empty DB returns empty list without mock insertions", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      } as any);

      const res = await intelligenceService.getTigers();
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(0);
    });

    it("getAlerts() on empty DB returns empty list without mock alerts", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      } as any);

      const res = await intelligenceService.getAlerts();
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(0);
    });
  });

  describe("Human Review & Verification Workflow", () => {
    it("verifyDetection() submits CONFIRMED decision with session actor", async () => {
      sessionStorage.setItem("tt_session_token", "officer-session-123");

      let sentBody: any = null;
      let sentHeaders: any = null;
      global.fetch = vi.fn().mockImplementation((url, init) => {
        sentBody = JSON.parse(init?.body);
        sentHeaders = init?.headers;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: "SUCCESS",
            message: "Detection verified successfully.",
            detection_id: "DET-001",
            human_decision: "CONFIRMED",
            verified_tiger_id: "T-101",
          }),
        });
      });

      const res = await intelligenceService.verifyDetection(
        "DET-001",
        "CONFIRMED",
        "T-101",
        "RFO-PATIL",
        "Distinct right shoulder pattern match"
      );

      expect(res.status).toBe("SUCCESS");
      expect(res.human_decision).toBe("CONFIRMED");
      expect(sentBody.decision).toBe("CONFIRMED");
      expect(sentBody.corrected_tiger_id).toBe("T-101");
      expect(sentHeaders["X-Session-Token"]).toBe("officer-session-123");
    });

    it("verifyDetection() submits REASSIGNED decision with new tiger ID", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          message: "Reassigned.",
          detection_id: "DET-002",
          human_decision: "REASSIGNED",
          verified_tiger_id: "T-108",
        }),
      } as any);

      const res = await intelligenceService.verifyDetection(
        "DET-002",
        "REASSIGNED",
        "T-108"
      );
      expect(res.human_decision).toBe("REASSIGNED");
    });
  });

  describe("API Error States", () => {
    it("throws ApiError with status 403 on forbidden access", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({ detail: "File type not permitted." }),
      } as any);

      await expect(intelligenceService.getTigers()).rejects.toThrow(ApiError);
      try {
        await intelligenceService.getTigers();
      } catch (err: any) {
        expect(err.status).toBe(403);
        expect(err.message).toBe("File type not permitted.");
      }
    });

    it("handles connection failure when API server is offline", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

      await expect(intelligenceService.getHealth()).rejects.toThrow(ApiError);
      try {
        await intelligenceService.getHealth();
      } catch (err: any) {
        expect(err.status).toBe(0);
        expect(err.message).toContain("Failed to fetch");
      }
    });
  });

  describe("Database Backup & Recovery API", () => {
    it("getBackups() returns backup list", async () => {
      const mockBackups = [
        {
          backup_id: "BKP-20260817-120000",
          filename: "pench_tigers_20260817_120000.db",
          size_bytes: 124000,
          created_at: "2026-08-17T12:00:00Z",
          is_valid: true,
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ backups: mockBackups }),
      } as any);

      const res = await intelligenceService.getBackups();
      expect(res.backups.length).toBe(1);
      expect(res.backups[0].backup_id).toBe("BKP-20260817-120000");
    });

    it("createBackup() triggers offline snapshot creation", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          backup_id: "BKP-NEW",
          filename: "pench_tigers_new.db",
          is_valid: true,
          size_bytes: 204800,
        }),
      } as any);

      const res = await intelligenceService.createBackup("Routine evening backup");
      expect(res.is_valid).toBe(true);
      expect(res.backup_id).toBe("BKP-NEW");
    });
  });
});
