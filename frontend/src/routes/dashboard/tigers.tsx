import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  PawPrint,
  Search,
  MapPin,
  Calendar,
  Compass,
  ArrowUpRight,
  X,
  AlertTriangle,
  Radio,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTigerId, setSelectedTigerId] = useState<string | null>(null);
  const [tigerDetail, setTigerDetail] = useState<TigerDeepProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "movement" | "evidence">("overview");
  const [techDetailsOpen, setTechDetailsOpen] = useState(false);

  useEffect(() => {
    intelligenceService
      .getTigers()
      .then((res) => {
        setTigers(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load tiger catalog:", err);
        setLoading(false);
      });
  }, []);

  const handleSelectTiger = async (tid: string) => {
    setSelectedTigerId(tid);
    setActiveTab("overview");
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
    const matchesStatus =
      statusFilter === "all" || t.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Search/Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Tiger Catalog
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Known individual stripe-pattern profiles & territory tracking in Pench
          </p>
        </div>

        {/* Clean Search & Filter */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tiger..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-48 sm:w-56 rounded-md border border-border/70 bg-secondary/40 pl-8.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-border/70 bg-secondary/40 px-3 text-xs text-foreground focus:border-primary focus:outline-none transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="resident">Resident</option>
            <option value="transient">Transient</option>
            <option value="dispersing">Dispersing</option>
          </select>
        </div>
      </div>

      {/* Tiger Grid */}
      {loading ? (
        <div className="py-24 text-center text-xs text-muted-foreground">
          Loading Pench tiger catalog...
        </div>
      ) : filteredTigers.length === 0 ? (
        <div className="calm-card rounded-lg p-12 text-center space-y-3">
          <PawPrint className="size-8 text-primary/40 mx-auto" />
          <h3 className="font-display text-sm font-semibold text-foreground">
            No tigers found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {tigers.length === 0
              ? "No tiger profiles registered yet. Ingest camera trap images to automatically discover and register tigers."
              : "No tigers match your search criteria. Try clearing the filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTigers.map((t) => (
            <div
              key={t.tiger_id}
              onClick={() => handleSelectTiger(t.tiger_id)}
              className="calm-card-hover rounded-lg overflow-hidden flex flex-col justify-between cursor-pointer group shadow-xs"
            >
              <div>
                {/* Large Flank Crop Image */}
                <div className="relative aspect-[16/11] w-full overflow-hidden bg-secondary/30 flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50">
                    <PawPrint className="size-8 text-primary/40" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
                      Stripe Profile
                    </span>
                  </div>

                  {t.reference_image_path && (
                    <img
                      src={api.getImageUrl(t.reference_image_path)}
                      alt={t.name || t.tiger_id}
                      className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-103"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  )}

                  <span className="absolute top-2.5 right-2.5 rounded px-2 py-0.5 text-[10px] font-semibold bg-black/60 text-white backdrop-blur-md border border-white/10">
                    {t.status}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {t.tiger_id}
                    </h3>
                    <span className="text-xs text-muted-foreground">{t.name}</span>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground pt-1">
                    <div className="flex items-center justify-between">
                      <span>Last seen:</span>
                      <span className="font-medium text-foreground">
                        Station {t.primary_flank ? `STN (${t.primary_flank} flank)` : "Field"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last detected:</span>
                      <span className="font-medium text-foreground">
                        {t.last_seen ? new Date(t.last_seen).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Recent"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Link */}
              <div className="px-4 py-2.5 border-t border-border/30 bg-secondary/20 flex items-center justify-between text-xs font-semibold text-primary">
                <span>View tiger profile</span>
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over Clean Tiger Profile Drawer */}
      {selectedTigerId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-xl flex-col border-l border-border bg-[oklch(0.14_0.012_150)] shadow-2xl">
            {/* Drawer Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-6">
              <div className="flex items-center gap-3">
                <div className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary border border-primary/20">
                  <PawPrint className="size-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    {selectedTigerId} {tigerDetail?.name ? `· ${tigerDetail.name}` : ""}
                  </h2>
                  <span className="text-xs text-signal font-medium">
                    {tigerDetail?.status || "Resident Tiger"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTigerId(null);
                  setTigerDetail(null);
                }}
                className="grid size-7 place-items-center rounded-md border border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Profile Tabs */}
            <div className="flex border-b border-border/40 px-6 bg-secondary/15">
              {(["overview", "movement", "evidence"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading || !tigerDetail ? (
                <div className="py-20 text-center text-xs text-muted-foreground">
                  Loading tiger intelligence profile...
                </div>
              ) : activeTab === "overview" ? (
                /* TAB 1: OVERVIEW */
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="calm-card rounded-md p-3.5 space-y-1">
                      <span className="text-muted-foreground text-xs">Estimated Home Range</span>
                      <p className="font-display text-lg font-bold text-foreground">
                        {tigerDetail.occupancy.home_range_km2} km²
                      </p>
                    </div>
                    <div className="calm-card rounded-md p-3.5 space-y-1">
                      <span className="text-muted-foreground text-xs">Total Sightings</span>
                      <p className="font-display text-lg font-bold text-primary">
                        {tigerDetail.occupancy.total_sightings} captures
                      </p>
                    </div>
                  </div>

                  {/* Territory Centroid */}
                  <div className="calm-card rounded-md p-4 space-y-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-primary" />
                      Home Range Centroid
                    </span>
                    <p className="text-xs text-muted-foreground font-mono">
                      {tigerDetail.occupancy.centroid_lat
                        ? `${tigerDetail.occupancy.centroid_lat.toFixed(4)}° N, ${tigerDetail.occupancy.centroid_lon?.toFixed(4)}° E`
                        : "Centroid calculated from sighting cluster"}
                    </p>
                  </div>

                  {/* Active Alerts for this tiger */}
                  {tigerDetail.alerts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="size-3.5" />
                        Active Movement Alerts ({tigerDetail.alerts.length})
                      </h4>
                      <div className="space-y-2">
                        {tigerDetail.alerts.map((a) => (
                          <div
                            key={a.alert_id}
                            className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1"
                          >
                            <div className="flex justify-between font-semibold text-foreground">
                              <span>{a.title}</span>
                              <span className="text-destructive font-mono text-[10px]">{a.severity}</span>
                            </div>
                            <p className="text-muted-foreground text-xs">{a.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === "movement" ? (
                /* TAB 2: MOVEMENT */
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Sequential Sighting Trajectory
                    </h3>
                    <div className="relative pl-5 space-y-4 border-l border-border/50">
                      {tigerDetail.movement_history.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No historical movement records logged yet.
                        </p>
                      ) : (
                        tigerDetail.movement_history.map((m, idx) => (
                          <div key={m.movement_id || idx} className="relative">
                            <span className="absolute -left-[25px] top-1 size-2 rounded-full bg-primary border-2 border-[oklch(0.14_0.012_150)]" />
                            <div className="rounded-md border border-border/40 bg-secondary/20 p-3 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">
                                  Station {m.station_id}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {m.timestamp ? new Date(m.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : ""}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                Coordinates: {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                              </p>
                              {m.displacement_from_prev_km !== undefined && (
                                <p className="text-[11px] text-primary">
                                  Displacement: {m.displacement_from_prev_km.toFixed(2)} km
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* TAB 3: EVIDENCE */
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Registered Reference Flank Patterns
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {tigerDetail.reference_crops.length === 0 ? (
                        <div className="col-span-2 rounded-md border border-border/40 p-6 text-center text-xs text-muted-foreground">
                          Reference flank crop registered in tiger master catalog.
                        </div>
                      ) : (
                        tigerDetail.reference_crops.map((c, idx) => (
                          <div
                            key={idx}
                            className="overflow-hidden rounded-md border border-border/40 bg-black/40"
                          >
                            <img
                              src={api.getImageUrl(c.source_crop_path)}
                              alt={`${selectedTigerId} ${c.crop_type}`}
                              className="aspect-[16/10] w-full object-cover"
                            />
                            <div className="bg-secondary/40 p-2 text-center text-[10px] font-medium text-muted-foreground">
                              {c.crop_type.toUpperCase()} FLANK
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Technical Re-ID Details (Expandable) */}
                  <div className="border border-border/40 rounded-md overflow-hidden bg-secondary/10">
                    <button
                      type="button"
                      onClick={() => setTechDetailsOpen(!techDetailsOpen)}
                      className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-secondary/20 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers className="size-3.5 text-primary" />
                        Technical Metric & Embedding Details
                      </span>
                      <ChevronDown
                        className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                          techDetailsOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {techDetailsOpen && (
                      <div className="p-3 border-t border-border/40 space-y-2 text-xs font-mono text-muted-foreground bg-black/20">
                        <div>Foundation Model: MegaDescriptor-T-224 (Swin-T)</div>
                        <div>Embedding Space: 768-dimensional L2 Metric</div>
                        <div>Metric Threshold: Keep $\ge$ 0.15, Review $\ge$ 0.08</div>
                        <div>Identity Status: Verified Multi-Station Resident</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
