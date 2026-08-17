import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  PawPrint,
  Search,
  Filter,
  MapPin,
  Calendar,
  Compass,
  ArrowUpRight,
  X,
  AlertTriangle,
  Radio,
  ChevronRight,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { intelligenceService } from "@/lib/services";
import { api } from "@/lib/api/client";
import type { TigerProfile, TigerDeepProfile } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/tigers")({
  component: TigerCatalogPage,
});

function TigerCatalogPage() {
  const [tigers, setTigers] = useState<TigerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTigerId, setSelectedTigerId] = useState<string | null>(null);
  const [tigerDetail, setTigerDetail] = useState<TigerDeepProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    intelligenceService
      .getTigers()
      .then((res) => {
        setTigers(res);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("API offline, using fallback tigers:", err);
        setLoading(false);
      });
  }, []);

  const handleSelectTiger = async (tid: string) => {
    setSelectedTigerId(tid);
    setDetailLoading(true);
    try {
      const detail = await intelligenceService.getTigerProfile(tid);
      setTigerDetail(detail);
    } catch (err) {
      console.error("Failed to load tiger deep profile:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredTigers = tigers.filter((t) => {
    const matchesSearch =
      t.tiger_id.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase());
    const matchesGender =
      genderFilter === "all" || t.gender.toLowerCase() === genderFilter.toLowerCase();
    const matchesStatus =
      statusFilter === "all" || t.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesGender && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Registered Individual Tiger Catalog
          </h1>
          <p className="data-chip text-muted-foreground">
            Unique stripe-pattern identity registry & territory profiles for Pench Reserve
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Tiger ID or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-56 rounded-sm border border-border bg-secondary/80 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="h-9 rounded-sm border border-border bg-secondary/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="unknown">Unknown</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-sm border border-border bg-secondary/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="resident">Resident</option>
            <option value="transient">Transient</option>
            <option value="dispersing">Dispersing</option>
          </select>
        </div>
      </div>

      {/* Tiger Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTigers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
            No tigers matched the current filter criteria.
          </div>
        ) : (
          filteredTigers.map((t) => (
            <div
              key={t.tiger_id}
              onClick={() => handleSelectTiger(t.tiger_id)}
              className="panel group relative cursor-pointer rounded-sm p-4 transition-all hover:border-primary hover:shadow-[var(--shadow-glow)]"
            >
              {/* Reference Flank Crop Thumbnail */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-sm border border-border bg-black">
                {t.reference_image_path ? (
                  <img
                    src={api.getImageUrl(t.reference_image_path)}
                    alt={t.name}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-secondary/40 text-muted-foreground">
                    <PawPrint className="size-10 text-primary/40" />
                  </div>
                )}

                <span className="data-chip absolute top-2 right-2 rounded-sm border border-primary/40 bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary backdrop-blur-md">
                  {t.status}
                </span>
              </div>

              {/* Tiger Details */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-base font-bold text-primary group-hover:underline">
                    {t.tiger_id}
                  </h3>
                  <span className="text-xs font-medium text-foreground">{t.name}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Sightings:</span>
                    <p className="font-mono font-semibold text-foreground">{t.total_sightings}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Home Range:</span>
                    <p className="font-mono font-semibold text-foreground">
                      {t.home_range_area_km2 > 0 ? `${t.home_range_area_km2} km²` : "1 Station"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Flank:</span>
                    <p className="font-mono text-foreground capitalize">{t.primary_flank}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sex:</span>
                    <p className="font-mono text-foreground capitalize">{t.gender}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                  <span className="truncate">
                    Last: {t.last_seen ? t.last_seen.split("T")[0] : "Recent"}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    Profile <ArrowUpRight className="size-3" />
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slide-over Deep Profile Drawer */}
      {selectedTigerId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-[oklch(0.16_0.012_150)] shadow-2xl">
            {/* Drawer Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-sm bg-primary/10 text-primary">
                  <PawPrint className="size-5" />
                </div>
                <div>
                  <h2 className="font-mono text-lg font-bold text-primary">
                    {selectedTigerId} · {tigerDetail?.name}
                  </h2>
                  <p className="data-chip text-muted-foreground">
                    Individual Intelligence Profile · Minimum Convex Polygon (MCP)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTigerId(null);
                  setTigerDetail(null);
                }}
                className="grid size-8 place-items-center rounded-sm border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading || !tigerDetail ? (
                <div className="py-20 text-center text-sm text-muted-foreground">
                  Loading deep movement and biometric profile...
                </div>
              ) : (
                <>
                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="panel rounded-sm p-3">
                      <span className="text-muted-foreground text-xs">Home Range (100% MCP)</span>
                      <p className="mt-1 font-mono text-lg font-bold text-foreground">
                        {tigerDetail.occupancy.home_range_km2} km²
                      </p>
                    </div>
                    <div className="panel rounded-sm p-3">
                      <span className="text-muted-foreground text-xs">Total Sightings</span>
                      <p className="mt-1 font-mono text-lg font-bold text-primary">
                        {tigerDetail.occupancy.total_sightings} captures
                      </p>
                    </div>
                    <div className="panel rounded-sm p-3">
                      <span className="text-muted-foreground text-xs">Territory Centroid</span>
                      <p className="mt-1 font-mono text-xs text-foreground">
                        {tigerDetail.occupancy.centroid_lat
                          ? `${tigerDetail.occupancy.centroid_lat.toFixed(3)}, ${tigerDetail.occupancy.centroid_lon?.toFixed(3)}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Reference Flank Crops Gallery */}
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">
                      Registered Reference Flank Patterns
                    </h3>
                    <p className="data-chip text-muted-foreground">
                      High-confidence crops used for metric Re-ID stripe embedding
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {tigerDetail.reference_crops.length === 0 ? (
                        <div className="col-span-2 rounded-sm border border-border p-4 text-center text-xs text-muted-foreground">
                          No separate reference crops registered in gallery.
                        </div>
                      ) : (
                        tigerDetail.reference_crops.map((c, idx) => (
                          <div
                            key={idx}
                            className="overflow-hidden rounded-sm border border-border bg-black"
                          >
                            <img
                              src={api.getImageUrl(c.source_crop_path)}
                              alt={`${selectedTigerId} ${c.crop_type}`}
                              className="aspect-[16/10] w-full object-cover"
                            />
                            <div className="bg-secondary/80 px-2.5 py-1.5 text-center font-mono text-[11px] text-foreground">
                              {c.crop_type.toUpperCase()} FLANK CROP
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Active Alerts for this tiger */}
                  {tigerDetail.alerts.length > 0 && (
                    <div>
                      <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-destructive">
                        <AlertTriangle className="size-4" /> Actionable Alerts on Record (
                        {tigerDetail.alerts.length})
                      </h3>
                      <div className="mt-2 space-y-2">
                        {tigerDetail.alerts.map((a) => (
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

                  {/* Chronological Movement Trajectory */}
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">
                      Chronological Sighting Trajectory
                    </h3>
                    <p className="data-chip text-muted-foreground">
                      Sequential camera-trap encounters across Pench reserve stations
                    </p>

                    <div className="mt-3 relative pl-6 space-y-4 border-l border-border">
                      {tigerDetail.movement_history.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No historical movement records logged.
                        </p>
                      ) : (
                        tigerDetail.movement_history.map((m, idx) => (
                          <div key={m.movement_id || idx} className="relative">
                            {/* Dot indicator */}
                            <span className="absolute -left-[31px] top-1 size-2.5 rounded-full border-2 border-primary bg-[oklch(0.16_0.012_150)]" />

                            <div className="rounded-sm border border-border bg-secondary/40 p-3 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-primary">
                                  Station {m.station_id}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {m.timestamp}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                                <span>
                                  Lat/Lon: {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                                </span>
                                {m.displacement_from_prev_km !== undefined && (
                                  <span>
                                    Displacement: {m.displacement_from_prev_km.toFixed(2)} km
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
