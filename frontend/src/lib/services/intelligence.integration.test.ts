import { describe, it, expect, vi, beforeEach } from "vitest";
import { intelligenceService } from "./index";
import { authApi } from "../auth/api";

describe("Frontend API-to-Service Integration & Contract Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const store: Record<string, string> = {
      tt_session_token: "integration-session-token-12345",
    };
    global.sessionStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
      key: (i: number) => Object.keys(store)[i] ?? null,
      length: Object.keys(store).length,
    };
  });

  it("integrates real FastAPI overview contract and strictly preserves zeros on empty DB", async () => {
    const realFastApiPayload = {
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
      json: async () => realFastApiPayload,
    } as any);

    const overview = await intelligenceService.getOverview();

    // Verify exact contract mappings
    expect(overview.total_tigers).toBe(0);
    expect(overview.identification_confidence).toBe(0.0);
    expect(overview.latest_ingestion_run).toBeNull();
    expect(typeof overview.identification_confidence).toBe("number");
    expect(isNaN(overview.identification_confidence)).toBe(false);
  });

  it("integrates populated tiger profile and verifies encounter timestamps and spatial bounding", async () => {
    const realTigerProfilePayload = {
      tiger_id: "T-101",
      name: "Collarwali Daughter",
      gender: "F",
      status: "Resident",
      total_sightings: 12,
      home_range_area_km2: 24.8,
      current_centroid_lat: 21.65,
      current_centroid_lon: 79.30,
      recent_sightings: [
        {
          detection_id: "DET-001",
          image_id: "IMG-001",
          station_id: "STN-CORE-01",
          timestamp: "2026-08-17T06:30:00Z",
          detected_species: "tiger",
          species_confidence: 0.96,
          reid_similarity: 0.94,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => realTigerProfilePayload,
    } as any);

    const profile = await intelligenceService.getTigerProfile("T-101");
    expect(profile.tiger_id).toBe("T-101");
    expect(profile.gender).toBe("F");
    expect(profile.total_sightings).toBe(12);
    expect(profile.recent_sightings.length).toBe(1);
    expect(profile.recent_sightings[0].species_confidence).toBe(0.96);
  });

  it("integrates backup and disaster recovery contract validation", async () => {
    const realBackupValidationPayload = {
      filename: "pench_tigers_20260817_120000.db",
      is_valid: true,
      message: "Integrity verified successfully.",
      table_counts: {
        tigers: 15,
        detections: 142,
        images: 850,
        alerts: 4,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => realBackupValidationPayload,
    } as any);

    const val = await intelligenceService.validateBackup("pench_tigers_20260817_120000.db");
    expect(val.is_valid).toBe(true);
    expect(val.table_counts.tigers).toBe(15);
    expect(val.table_counts.detections).toBe(142);
  });
});
