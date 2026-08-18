import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Radio,
  Search,
  MapPin,
  Camera,
  PawPrint,
  Clock,
  Compass,
  AlertTriangle,
  X,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Map as MapIcon,
} from "lucide-react";
import { toast } from "sonner";
import { intelligenceService } from "@/lib/services";
import { api } from "@/lib/api/client";
import type { CameraStation, DetectionRecord, AlertRecord } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/stations")({
  component: CameraStationsPage,
});

function CameraStationsPage() {
  const [stations, setStations] = useState<CameraStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [stationDetail, setStationDetail] = useState<
    (CameraStation & {
      species_breakdown: Array<{ detected_species: string; count: number }>;
      recent_detections: DetectionRecord[];
      alerts: AlertRecord[];
    }) | null
  >(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add Station Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newStation, setNewStation] = useState({
    station_id: "",
    camera_model: "Reconyx HyperFire 2",
    latitude: 21.725,
    longitude: 79.33,
    zone: "Core",
    distance_to_village_km: 5.0,
    distance_to_buffer_km: 10.0,
    survey_id: "Pench_2026_Cycle1",
    active_from: new Date().toISOString().split("T")[0],
  });

  const loadStations = async () => {
    try {
      const res = await intelligenceService.getStations();
      setStations(res);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load camera stations:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const handleSelectStation = async (sid: string) => {
    setSelectedStationId(sid);
    setDetailLoading(true);
    try {
      const detail = await intelligenceService.getStationDetail(sid);
      setStationDetail(detail);
    } catch (err) {
      console.error("Failed to load station detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStation.station_id.trim()) {
      toast.error("Please enter a unique Station ID (e.g. C17 or STN-01).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await intelligenceService.createStation({
        ...newStation,
        station_id: newStation.station_id.trim().toUpperCase(),
      });
      toast.success(res.message || `Station ${newStation.station_id} registered.`);
      setIsAddModalOpen(false);
      setNewStation({
        station_id: "",
        camera_model: "Reconyx HyperFire 2",
        latitude: 21.725,
        longitude: 79.33,
        zone: "Core",
        distance_to_village_km: 5.0,
        distance_to_buffer_km: 10.0,
        survey_id: "Pench_2026_Cycle1",
        active_from: new Date().toISOString().split("T")[0],
      });
      await loadStations();
    } catch (err: any) {
      toast.error(err.message || "Failed to register camera station.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStation = async (sid: string) => {
    if (!confirm(`Are you sure you want to decommission or delete camera station ${sid}?`)) return;
    try {
      const res = await intelligenceService.deleteStation(sid);
      toast.success(res.message);
      setSelectedStationId(null);
      setStationDetail(null);
      await loadStations();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove station.");
    }
  };

  const filteredStations = stations.filter((s) => {
    const matchesSearch = s.station_id.toLowerCase().includes(search.toLowerCase());
    const matchesZone =
      zoneFilter === "all" || (s.zone && s.zone.toLowerCase() === zoneFilter.toLowerCase());
    return matchesSearch && matchesZone;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Camera Station Intelligence & Survey Grid
          </h1>
          <p className="data-chip text-muted-foreground">
            Field deployment grid, spatial coordinates, detection density, and village boundary buffers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-sm bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Plus className="size-3.5" />
            Register Camera Station
          </button>

          <div className="relative">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search station ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-44 rounded-sm border border-border bg-secondary/80 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="h-9 rounded-sm border border-border bg-secondary/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Zones</option>
            <option value="core">Core Zone</option>
            <option value="buffer">Buffer Zone</option>
            <option value="corridor">Corridor</option>
          </select>
        </div>
      </div>

      {/* Stations Table */}
      <div className="panel overflow-hidden rounded-sm border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/60 text-[11px] font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Station ID</th>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3">GPS Coordinates</th>
                <th className="px-4 py-3">Camera Hardware</th>
                <th className="px-4 py-3">Dist. to Village</th>
                <th className="px-4 py-3">Dist. to Buffer</th>
                <th className="px-4 py-3">Total Detections</th>
                <th className="px-4 py-3">Unique Tigers</th>
                <th className="px-4 py-3">Last Activity</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    Loading camera stations from database...
                  </td>
                </tr>
              ) : filteredStations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    No camera stations match the filter.
                  </td>
                </tr>
              ) : (
                filteredStations.map((s) => (
                  <tr
                    key={s.station_id}
                    onClick={() => handleSelectStation(s.station_id)}
                    className="cursor-pointer transition-colors hover:bg-secondary/30"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-primary">
                      {s.station_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`data-chip rounded-sm px-2 py-0.5 text-xs font-semibold ${
                        s.zone?.toLowerCase() === "buffer" ? "bg-amber-500/20 text-amber-400" : "bg-primary/20 text-primary"
                      }`}>
                        {s.zone || "Core"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[140px]">
                      {s.camera_model || "Reconyx HyperFire 2"}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span
                        className={`${
                          (s.distance_to_village_km || 5) <= 2.5
                            ? "font-bold text-destructive"
                            : "text-foreground"
                        }`}
                      >
                        {s.distance_to_village_km !== undefined
                          ? `${s.distance_to_village_km.toFixed(1)} km`
                          : "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {s.distance_to_buffer_km !== undefined
                        ? `${s.distance_to_buffer_km.toFixed(1)} km`
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">
                      {s.total_detections ?? 0}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-primary">
                      {s.distinct_tigers_recorded ?? 0}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {s.last_activity ? s.last_activity.split("T")[0] : "Active Grid"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-primary">
                        Inspect <ArrowUpRight className="size-3" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Camera Station Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-md border border-border bg-[oklch(0.16_0.012_150)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <Radio className="size-5 text-primary" />
                <h3 className="font-display text-base font-bold text-foreground">
                  Register Field Camera Station
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateStation} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Station ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. C17, STN-02"
                    value={newStation.station_id}
                    onChange={(e) => setNewStation({ ...newStation, station_id: e.target.value })}
                    className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Reserve Zone</label>
                  <select
                    value={newStation.zone}
                    onChange={(e) => setNewStation({ ...newStation, zone: e.target.value })}
                    className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="Core">Core Zone</option>
                    <option value="Buffer">Buffer Zone</option>
                    <option value="Corridor">Corridor</option>
                    <option value="Fringe">Fringe</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Latitude (° N) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newStation.latitude}
                    onChange={(e) => setNewStation({ ...newStation, latitude: parseFloat(e.target.value) || 21.72 })}
                    className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Longitude (° E) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newStation.longitude}
                    onChange={(e) => setNewStation({ ...newStation, longitude: parseFloat(e.target.value) || 79.33 })}
                    className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Distance to Village (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newStation.distance_to_village_km}
                    onChange={(e) => setNewStation({ ...newStation, distance_to_village_km: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Distance to Buffer (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newStation.distance_to_buffer_km}
                    onChange={(e) => setNewStation({ ...newStation, distance_to_buffer_km: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Camera Trap Model</label>
                  <input
                    type="text"
                    value={newStation.camera_model}
                    onChange={(e) => setNewStation({ ...newStation, camera_model: e.target.value })}
                    className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Survey Block ID</label>
                  <input
                    type="text"
                    value={newStation.survey_id}
                    onChange={(e) => setNewStation({ ...newStation, survey_id: e.target.value })}
                    className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-sm border border-border bg-secondary/60 px-4 py-2 text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <CheckCircle2 className="size-3.5" />
                  {submitting ? "Registering..." : "Save Station"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Station Detail Drawer */}
      {selectedStationId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-xl flex-col border-l border-border bg-[oklch(0.16_0.012_150)] shadow-2xl">
            {/* Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-sm bg-primary/10 text-primary">
                  <Radio className="size-5" />
                </div>
                <div>
                  <h2 className="font-mono text-lg font-bold text-primary">
                    Station: {selectedStationId}
                  </h2>
                  <p className="data-chip text-muted-foreground">
                    Telemetry, Species Occupancy & Local Alerts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteStation(selectedStationId)}
                  title="Decommission Station"
                  className="grid size-8 place-items-center rounded-sm border border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedStationId(null);
                    setStationDetail(null);
                  }}
                  className="grid size-8 place-items-center rounded-sm border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading || !stationDetail ? (
                <div className="py-20 text-center text-sm text-muted-foreground">
                  Loading station telemetry and species sightings...
                </div>
              ) : (
                <>
                  {/* Station Metrics */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="panel rounded-sm p-3">
                      <span className="text-muted-foreground">Zone</span>
                      <p className="mt-1 font-semibold text-foreground">
                        {stationDetail.zone || "Core"}
                      </p>
                    </div>
                    <div className="panel rounded-sm p-3">
                      <span className="text-muted-foreground">Village Dist.</span>
                      <p
                        className={`mt-1 font-mono font-bold ${
                          (stationDetail.distance_to_village_km || 5) <= 2.5
                            ? "text-destructive"
                            : "text-foreground"
                        }`}
                      >
                        {stationDetail.distance_to_village_km?.toFixed(1) || "5.0"} km
                      </p>
                    </div>
                    <div className="panel rounded-sm p-3">
                      <span className="text-muted-foreground">Camera Unit</span>
                      <p className="mt-1 font-mono text-[11px] text-foreground truncate">
                        {stationDetail.camera_model || "Reconyx HyperFire 2"}
                      </p>
                    </div>
                  </div>

                  {/* Species Breakdown */}
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">
                      Species Sighting Frequency
                    </h3>
                    <div className="mt-3 space-y-2">
                      {stationDetail.species_breakdown.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No species sightings recorded yet.
                        </p>
                      ) : (
                        stationDetail.species_breakdown.map((sp) => (
                          <div
                            key={sp.detected_species}
                            className="flex items-center justify-between rounded-sm border border-border bg-secondary/40 px-3 py-2 text-xs"
                          >
                            <span className="font-medium capitalize text-foreground">
                              {sp.detected_species}
                            </span>
                            <span className="font-mono font-bold text-primary">
                              {sp.count} captures
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Detections at Station */}
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">
                      Recent Sighting Frames
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {stationDetail.recent_detections.slice(0, 6).map((det) => (
                        <div
                          key={det.detection_id}
                          className="overflow-hidden rounded-sm border border-border bg-black"
                        >
                          {det.crop_path ? (
                            <img
                              src={api.getImageUrl(det.crop_path)}
                              alt="Crop"
                              className="aspect-[16/10] w-full object-cover"
                            />
                          ) : (
                            <div className="flex aspect-[16/10] items-center justify-center text-xs text-muted-foreground">
                              No crop
                            </div>
                          )}
                          <div className="bg-secondary/90 px-2 py-1 text-center font-mono text-[10px] text-foreground">
                            {det.verified_tiger_id ||
                              det.reid_matched_tiger_id ||
                              det.detected_species}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alerts at station */}
                  {stationDetail.alerts.length > 0 && (
                    <div>
                      <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-destructive">
                        <AlertTriangle className="size-4" /> Active Alerts at this Station
                      </h3>
                      <div className="mt-2 space-y-2">
                        {stationDetail.alerts.map((a) => (
                          <div
                            key={a.alert_id}
                            className="rounded-sm border border-destructive/40 bg-destructive/5 p-3 text-xs"
                          >
                            <div className="flex justify-between font-semibold text-foreground">
                              <span>{a.title}</span>
                              <span className="font-mono text-destructive">{a.severity}</span>
                            </div>
                            <p className="mt-1 text-muted-foreground">{a.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
