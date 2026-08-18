import { api } from "../api/client";
import type {
  AlertRecord,
  AnalyticsResponse,
  AuditLogRecord,
  CameraStation,
  DetectionRecord,
  GeoJSONFeatureCollection,
  ImageRecord,
  IngestionRunSummary,
  MediaSourceItem,
  MovementRecord,
  OverviewResponse,
  PipelineRunRecord,
  PreScanReport,
  SystemHealthResponse,
  TigerDeepProfile,
  TigerProfile,
} from "../types/intelligence";

export const intelligenceService = {
  // System Health & Telemetry
  getHealth: () => api.get<{ status: string; version: string; offline_mode: boolean }>("/health"),
  getSystemHealth: () => api.get<SystemHealthResponse>("/system/health"),

  // Overview / Command Center
  getOverview: () => api.get<OverviewResponse>("/overview"),

  // Tigers
  getTigers: () => api.get<TigerProfile[]>("/tigers"),
  getTigerProfile: (tigerId: string) => api.get<TigerDeepProfile>(`/tigers/${tigerId}`),

  // Detections
  getDetections: (params?: {
    page?: number;
    limit?: number;
    species?: string;
    tiger_id?: string;
    station_id?: string;
    confidence_min?: number;
    review_only?: boolean;
    verified_only?: boolean;
  }) =>
    api.get<{
      items: DetectionRecord[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>("/detections", params),

  getDetectionDetail: (detectionId: string) => api.get<DetectionRecord>(`/detections/${detectionId}`),

  verifyDetection: (
    detectionId: string,
    decision: "CONFIRMED" | "REJECTED" | "REASSIGNED" | "NEW_TIGER",
    correctedTigerId?: string | null,
    actor: string = "OFFICER_ON_DUTY",
    notes: string = ""
  ) =>
    api.post<{
      status: string;
      message: string;
      detection_id: string;
      human_decision: string;
      verified_tiger_id?: string;
    }>(`/detections/${detectionId}/verify`, {
      decision,
      corrected_tiger_id: correctedTigerId,
      actor,
      notes,
    }),

  // Camera Stations
  getStations: () => api.get<CameraStation[]>("/stations"),
  getStationDetail: (stationId: string) =>
    api.get<
      CameraStation & {
        species_breakdown: Array<{ detected_species: string; count: number }>;
        recent_detections: DetectionRecord[];
        alerts: AlertRecord[];
      }
    >(`/stations/${stationId}`),
  createStation: (stationData: Partial<CameraStation>) =>
    api.post<{ status: string; message: string; station: CameraStation }>("/stations", stationData),
  updateStation: (stationId: string, stationData: Partial<CameraStation>) =>
    api.put<{ status: string; message: string; station: CameraStation }>(`/stations/${stationId}`, stationData),
  deleteStation: (stationId: string) =>
    api.delete<{ status: string; message: string; fully_deleted: boolean }>(`/stations/${stationId}`),

  // Officer Accounts & Workstation Access (Offline Auth)
  getAuthStatus: () =>
    api.get<{ configured: boolean; officer_count: number; workstation_id?: string; reserve_name?: string }>("/auth/status"),
  listOfficers: () =>
    api.get<{ officers: Array<{ id: string; officer_id: string; display_name: string; role: string; is_active: number; created_at: string; last_login_at?: string }> }>("/auth/officers"),
  createOfficer: (data: { officer_id: string; display_name: string; role: string; password: string }) =>
    api.post<{ id: string; officer_id: string; role: string; message: string }>("/auth/officers", data),
  resetOfficerPassword: (officerId: string, data: { new_password: string }) =>
    api.patch<{ message: string }>(`/auth/officers/${officerId}/reset`, data),
  deactivateOfficer: (officerId: string) =>
    api.patch<{ message: string }>(`/auth/officers/${officerId}/deactivate`),

  // Movement & Spatial
  getMovement: (tigerId?: string) => api.get<MovementRecord[]>("/movement", tigerId ? { tiger_id: tigerId } : undefined),
  getMapGeoJSON: () => api.get<GeoJSONFeatureCollection>("/map/geojson"),

  // Alerts & Lifecycle
  getAlerts: (params?: {
    severity?: string;
    alert_type?: string;
    tiger_id?: string;
    station_id?: string;
    active_only?: boolean;
  }) => api.get<AlertRecord[]>("/alerts", params),

  dismissAlert: (alertId: string) => api.post<{ status: string; alert_id: string }>(`/alerts/${alertId}/dismiss`),

  acknowledgeAlert: (alertId: string, actor: string = "OFFICER_ON_DUTY", notes: string = "") =>
    api.post<{ status: string; alert: any }>(`/alerts/${alertId}/acknowledge`, {
      action: "ACKNOWLEDGE",
      actor,
      notes,
    }),

  resolveAlert: (alertId: string, actor: string = "OFFICER_ON_DUTY", notes: string = "") =>
    api.post<{ status: string; alert: any }>(`/alerts/${alertId}/resolve`, {
      action: "RESOLVE",
      actor,
      notes,
    }),

  markFalsePositive: (alertId: string, actor: string = "OFFICER_ON_DUTY", notes: string = "") =>
    api.post<{ status: string; alert: any }>(`/alerts/${alertId}/false-positive`, {
      action: "FALSE_POSITIVE",
      actor,
      notes,
    }),

  suppressAlert: (alertId: string, actor: string = "OFFICER_ON_DUTY", notes: string = "") =>
    api.post<{ status: string; alert: any }>(`/alerts/${alertId}/suppress`, {
      action: "SUPPRESS",
      actor,
      notes,
    }),

  // Database Backup & Disaster Recovery
  getBackups: () => api.get<{ backups: any[] }>("/system/backups"),
  createBackup: (note?: string) => api.post<any>("/system/backup", { note }),
  validateBackup: (filename: string) => api.get<any>(`/system/backups/${filename}/validate`),
  restoreBackup: (filename: string, confirm: boolean = true) =>
    api.post<any>("/system/restore", { filename, confirm }),

  // Images
  getImages: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    station_id?: string;
    is_corrupt?: boolean;
  }) =>
    api.get<{
      items: ImageRecord[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>("/images", params),

  // Analytics
  getAnalytics: () => api.get<AnalyticsResponse>("/analytics"),

  // Ingestion & Pipeline
  getPipelineSources: () =>
    api.get<{
      sources: MediaSourceItem[];
      default_staging_path: string;
      platform: string;
    }>("/pipeline/sources"),

  prescanSource: (sourcePath: string) =>
    api.post<PreScanReport>("/pipeline/prescan", { source_path: sourcePath }),

  getPipelineRuns: (limit: number = 20) =>
    api.get<PipelineRunRecord[]>("/pipeline/runs", { limit }),

  getPipelineStatus: () =>
    api.get<{
      engine: string;
      detector_model: string;
      reid_foundation_model: string;
      triage_thresholds: Record<string, number>;
      reid_thresholds: Record<string, number>;
      runs: IngestionRunSummary[];
    }>("/pipeline/status"),

  triggerIngest: (sourcePath: string, dryRun: boolean = false, stationId?: string) =>
    api.post<{
      job_id: string;
      status: string;
      message: string;
      images_discovered: number;
    }>("/pipeline/ingest", {
      source_path: sourcePath,
      dry_run: dryRun,
      station_id: stationId,
    }),

  // Audit Logs
  getAuditLogs: (params?: {
    entity_type?: string;
    action?: string;
    actor?: string;
    limit?: number;
  }) => api.get<AuditLogRecord[]>("/audit", params),
};
