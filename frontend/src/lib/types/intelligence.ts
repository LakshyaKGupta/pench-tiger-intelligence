/**
 * intelligence.ts — Core Data Contracts for TIGERTRACK AI Wildlife Intelligence Platform
 * Perfectly matches SQLite schema and FastAPI backend representations.
 */

export interface OverviewMetrics {
  total_tigers: number;
  active_camera_stations: number;
  total_detections: number;
  images_processed: number;
  quarantined_images: number;
  images_awaiting_review: number;
  active_alerts_count: number;
  identification_confidence: number;
}

export interface IngestionRunSummary {
  run_id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  source_type: "SD_CARD" | "LOCAL_FOLDER";
  source_path?: string;
  images_discovered: number;
  images_processed?: number;
  duplicates?: number;
  corrupt_files?: number;
  tigers_detected?: number;
  review_required?: number;
  alerts_generated?: number;
  completed_at?: string;
  deliverables_dir?: string;
  error?: string;
}

export interface OverviewResponse {
  kpis: OverviewMetrics;
  recent_sightings: DetectionRecord[];
  recent_alerts: AlertRecord[];
  detection_volume_chart: Array<{
    date_day: string;
    count: number;
    tiger_count: number;
    blank_count: number;
  }>;
  latest_ingestion_run: IngestionRunSummary;
}

export interface TigerProfile {
  tiger_id: string;
  name: string;
  gender: string;
  estimated_age?: number | null;
  primary_flank: string;
  reference_image_path?: string | null;
  total_sightings: number;
  home_range_area_km2: number;
  current_centroid_lat?: number | null;
  current_centroid_lon?: number | null;
  first_seen?: string | null;
  last_seen?: string | null;
  status: "Resident" | "Dispersing" | "Transient" | "Absent";
  notes?: string;
}

export interface TigerDeepProfile extends TigerProfile {
  occupancy: {
    total_sightings: number;
    home_range_km2: number;
    centroid_lat: number | null;
    centroid_lon: number | null;
    convex_hull_polygon?: Array<[number, number]>;
  };
  movement_history: MovementRecord[];
  detections: DetectionRecord[];
  alerts: AlertRecord[];
  reference_crops: Array<{
    crop_type: string;
    source_crop_path: string;
  }>;
}

export interface DetectionRecord {
  detection_id: string;
  image_id: string;
  station_id: string;
  timestamp: string;
  detected_species: string;
  species_confidence: number;
  bbox_x1?: number;
  bbox_y1?: number;
  bbox_x2?: number;
  bbox_y2?: number;
  reid_matched_tiger_id?: string | null;
  reid_similarity?: number | null;
  reid_confidence_level?: "HIGH" | "MEDIUM_REVIEW_REQUIRED" | "LOW_NEW_INDIVIDUAL" | "UNMATCHED";
  crop_path?: string | null;
  human_verified: number;
  human_decision?: string | null;
  verified_tiger_id?: string | null;
  human_actor?: string | null;
  human_timestamp?: string | null;
  file_name?: string;
  original_path?: string;
  file_size_bytes?: number;
  latitude?: number | null;
  longitude?: number | null;
  zone?: string | null;
  reid_evidence_breakdown?: {
    match_candidate?: string;
    similarity_score?: number;
    separation_margin?: number;
    decision_threshold?: number;
    top_candidates?: Array<{ tiger_id: string; similarity: number }>;
  };
  data_quality_flags?: string[];
}

export interface CameraStation {
  station_id: string;
  zone: string;
  latitude: number;
  longitude: number;
  elevation_m?: number;
  camera_model?: string;
  installed_date?: string;
  last_serviced_date?: string;
  status?: string;
  distance_to_village_km?: number;
  distance_to_buffer_km?: number;
  total_detections?: number;
  distinct_tigers_recorded?: number;
  last_activity?: string | null;
}

export interface MovementRecord {
  movement_id: string;
  tiger_id: string;
  station_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  displacement_from_prev_km?: number;
  hours_from_prev?: number;
  is_anomalous_speed?: number;
  is_range_expansion?: number;
  zone?: string;
  distance_to_village_km?: number;
  distance_to_buffer_km?: number;
}

export interface SystemHealthResponse {
  status: "OPERATIONAL" | "DEGRADED" | "CRITICAL";
  mode: string;
  platform: string;
  application_version: string;
  database: {
    connected: boolean;
    path: string;
    writable: boolean;
  };
  storage: {
    storage_root: string;
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent_used: number;
    writable: boolean;
  };
  models: {
    megadetector_v6: {
      name: string;
      available: boolean;
      path?: string;
      size_mb?: number;
    };
    megadescriptor_reid: {
      name: string;
      available: boolean;
      embedding_dimension?: number;
    };
    yolov8_fallback: {
      name: string;
      available: boolean;
      path?: string;
    };
  };
  timestamp: string;
}

export interface PreScanReport {
  source_path: string;
  source_type: "SD_CARD" | "LOCAL_FOLDER" | "USB_STORAGE";
  total_discovered: number;
  total_bytes: number;
  total_mb: number;
  supported_images: number;
  unsupported_files: number;
  duplicate_images: number;
  corrupt_images: number;
  new_actionable_images: number;
  sample_files: string[];
}

export interface PipelineRunRecord {
  run_id: string;
  source_type: string;
  source_path: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  current_stage?: string;
  images_discovered: number;
  images_processed: number;
  duplicates: number;
  corrupt_files: number;
  tigers_detected: number;
  review_required: number;
  alerts_generated: number;
  error_message?: string | null;
  deliverables_dir?: string | null;
  started_at?: string;
  completed_at?: string;
}

export interface MediaSourceItem {
  name: string;
  path: string;
  type: "SD_CARD" | "USB_DRIVE";
  has_dcim: boolean;
}

export interface AlertRecord {
  alert_id: string;
  alert_type: "VILLAGE_RISK" | "RANGE_SHIFT" | "BUFFER_PROXIMITY" | "PROLONGED_ABSENCE" | "UNUSUAL_SPEED";
  severity: "CRITICAL" | "WARNING" | "INFO";
  tiger_id?: string | null;
  station_id?: string | null;
  timestamp: string;
  title: string;
  explanation: string;
  status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "FALSE_POSITIVE" | "SUPPRESSED";
  resolution_notes?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  evidence_data?: {
    distance_km?: number;
    threshold_km?: number;
    similarity?: number;
    days_since_last_seen?: number;
    median_interval_days?: number;
    absence_multiplier?: number;
    survey_effort_adequate?: boolean;
    active_stations_in_range?: number;
    speed_kmh?: number;
    [key: string]: any;
  };
  is_dismissed: number;
}

export interface ImageRecord {
  image_id: string;
  station_id: string;
  original_path: string;
  file_name: string;
  file_size_bytes: number;
  sha256_hash: string;
  timestamp?: string;
  exif_camera_make?: string;
  exif_camera_model?: string;
  is_corrupt: number;
  status: "raw" | "retained" | "quarantine" | "reviewed";
  data_quality_flags?: string[];
  retained_for_audit: number;
}

export interface AuditLogRecord {
  log_id: number;
  timestamp: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  details: string;
}

export interface AnalyticsResponse {
  species_distribution: Array<{ species: string; count: number }>;
  reid_confidence_distribution: Array<{ reid_confidence_level: string; count: number }>;
  alert_distribution: Array<{ alert_type: string; severity: string; count: number }>;
  top_stations: Array<{ station_id: string; detections_count: number }>;
  top_tigers: Array<{
    tiger_id: string;
    name: string;
    total_sightings: number;
    home_range_area_km2: number;
    last_seen: string | null;
  }>;
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "Point" | "Polygon" | "LineString";
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}
