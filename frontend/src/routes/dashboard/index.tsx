import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  PawPrint,
  Camera,
  AlertTriangle,
  ArrowRight,
  HardDriveDownload,
  MapPin,
  Clock,
  Compass,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Eye,
  AlertOctagon,
  Sparkles,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { intelligenceService } from "@/lib/services";
import { api } from "@/lib/api/client";
import type { OverviewResponse } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/")({
  component: CommandCenter,
});

function CommandCenter() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    intelligenceService
      .getOverview()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load overview data:", err);
        setError("Unable to connect to local intelligence service.");
        setLoading(false);
      });
  }, []);

  const kpis = data?.kpis || {
    total_tigers: 0,
    active_camera_stations: 0,
    total_detections: 0,
    images_processed: 0,
    quarantined_images: 0,
    images_awaiting_review: 0,
    active_critical_alerts: 0,
    triage_efficiency_percent: 0,
  };

  const recentSightings = data?.recent_sightings || [];
  const recentAlerts = data?.recent_alerts || [];
  const latestRun = data?.latest_ingestion_run;

  // Format relative last data processed
  const formatLastProcessed = () => {
    if (!latestRun?.completed_at) return "Ready for first ingestion";
    const date = new Date(latestRun.completed_at);
    const now = new Date();
    const diffMin = Math.round((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  const isFirstRun = kpis.total_tigers === 0 && kpis.images_processed === 0;

  const alertCount =
    kpis.active_alerts_count ?? (kpis as any).active_critical_alerts ?? recentAlerts.length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Reserve Status Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Pench Tiger Reserve
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-signal/10 px-2 py-0.5 text-[11px] font-medium text-signal border border-signal/20">
              <span className="size-1.5 rounded-full bg-signal"></span>
              Offline Ready
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Offline intelligence system · Last data processed {formatLastProcessed()}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/dashboard/ingest"
            className="flex items-center gap-2 rounded-md btn-amber px-4 py-2 text-xs font-semibold shadow-xs"
          >
            <HardDriveDownload className="size-3.5" />
            Ingest Camera Data
          </Link>
          <Link
            to="/dashboard/map"
            className="flex items-center gap-2 rounded-md border border-border/70 bg-secondary/40 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <MapPin className="size-3.5 text-primary" />
            Explore Map
          </Link>
        </div>
      </div>

      {/* First-Run Welcome Card (Visible when database is clean or low activity) */}
      {isFirstRun && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Sparkles className="size-4" />
                <span>Start with today's camera data</span>
              </div>
              <h2 className="font-display text-lg font-bold text-foreground">
                Process Camera Traps Offline
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Insert an SD card or choose a camera-data folder. TIGERTRACK filters blanks,
                identifies individual tigers by their stripe patterns, and maps movements with zero internet required.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/dashboard/ingest"
                className="flex items-center gap-2 rounded-md btn-amber px-5 py-2.5 text-xs font-semibold shadow-sm"
              >
                <HardDriveDownload className="size-4" />
                Start Ingestion
              </Link>
              <Link
                to="/dashboard/tigers"
                className="flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-secondary"
              >
                <PawPrint className="size-4 text-primary" />
                Explore Tigers
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4 Primary Operational Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={PawPrint}
          label="Tigers Identified"
          value={kpis.total_tigers}
          subtitle="Cataloged resident & transient tigers"
          variant="amber"
        />
        <MetricCard
          icon={Camera}
          label="Images Processed"
          value={kpis.images_processed}
          subtitle={`${kpis.quarantined_images} corrupt/blank quarantined`}
          variant="signal"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Active Alerts"
          value={alertCount}
          subtitle="Require officer acknowledgment"
          variant={alertCount > 0 ? "alert" : "default"}
        />
        <MetricCard
          icon={Compass}
          label="Active Stations"
          value={kpis.active_camera_stations}
          subtitle="Core, buffer & village fringe"
          variant="default"
        />
      </div>

      {/* Main Operational Feed: Needs Attention & Recent Activity */}
      <div className="grid gap-8 lg:grid-cols-[1.55fr_1fr]">
        {/* Left Column: Needs Attention & Recent Tiger Activity */}
        <div className="space-y-8">
          {/* SECTION 1: Needs Attention */}
          <div className="calm-card rounded-lg p-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3.5 mb-4">
              <div>
                <h2 className="font-display text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <AlertOctagon className="size-4 text-destructive" />
                  Needs Attention
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  High-priority ecological movement alerts & review items
                </p>
              </div>
              <Link
                to="/dashboard/alerts"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View all alerts <ArrowRight className="size-3" />
              </Link>
            </div>

            {recentAlerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle2 className="size-6 text-signal/60" />
                <span>All quiet in Pench. No pending critical alerts.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.alert_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-md bg-secondary/30 border border-border/40 hover:border-primary/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider ${
                            alert.severity === "CRITICAL"
                              ? "bg-destructive/20 text-destructive border border-destructive/30"
                              : "bg-amber/20 text-amber border border-amber/30"
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="font-semibold text-xs text-foreground">
                          {alert.title || alert.alert_type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {alert.explanation || "Territory or boundary displacement detected."}
                      </p>
                    </div>

                    <Link
                      to="/dashboard/alerts"
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-foreground transition-colors self-start sm:self-center"
                    >
                      Review evidence <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: Recent Tiger Activity */}
          <div className="calm-card rounded-lg p-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3.5 mb-4">
              <div>
                <h2 className="font-display text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <PawPrint className="size-4 text-primary" />
                  Recent Tiger Activity
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Latest individual identifications from camera stations
                </p>
              </div>
              <Link
                to="/dashboard/tigers"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                All tigers <ArrowRight className="size-3" />
              </Link>
            </div>

            {recentSightings.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent sightings recorded. Ingest an SD card to populate sightings.
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {recentSightings.slice(0, 5).map((s) => {
                  const tigerId = s.verified_tiger_id || s.reid_matched_tiger_id || "Tiger";
                  const confidence = s.reid_similarity
                    ? Math.round(s.reid_similarity * 100)
                    : Math.round(s.species_confidence * 100);

                  return (
                    <div
                      key={s.detection_id}
                      className="flex items-center justify-between py-3 hover:bg-secondary/20 rounded px-2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded overflow-hidden bg-black/40 border border-border/40 shrink-0">
                          {s.crop_path ? (
                            <img
                              src={api.getImageUrl(s.crop_path)}
                              alt={tigerId}
                              className="size-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="grid size-full place-items-center text-muted-foreground">
                              <PawPrint className="size-4 text-primary/60" />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display text-xs font-bold text-foreground">
                              {tigerId}
                            </span>
                            <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.2 rounded">
                              Station {s.station_id || "Field"}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {s.timestamp ? new Date(s.timestamp).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Today"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold text-signal bg-signal/10 px-2 py-0.5 rounded border border-signal/20">
                          {confidence}% Match
                        </span>
                        <Link
                          to="/dashboard/tigers"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          title="View Profile"
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Latest Ingestion & Where are the Tigers */}
        <div className="space-y-8">
          {/* SECTION 3: Latest Ingestion */}
          <div className="calm-card rounded-lg p-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
              <h2 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                <HardDriveDownload className="size-4 text-primary" />
                Latest Ingestion
              </h2>
              <Link
                to="/dashboard/ingest"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Ingest SD Card
              </Link>
            </div>

            <div className="space-y-4">
              <div className="rounded-md bg-secondary/30 border border-border/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {latestRun?.source_type ? `${latestRun.source_type.toUpperCase()} Batch` : "Camera Data Batch"}
                  </span>
                  <span className="text-[11px] text-signal font-semibold">
                    {latestRun?.status || "COMPLETED"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-border/30">
                  <div>
                    <span className="block text-xs font-bold text-foreground">
                      {latestRun?.total_images || kpis.images_processed || 0}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">Discovered</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-signal">
                      {(latestRun?.total_images || kpis.images_processed || 0) - (latestRun?.quarantined_images || kpis.quarantined_images || 0)}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">Processed</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-amber">
                      {latestRun?.quarantined_images || kpis.quarantined_images || 0}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">Quarantined</span>
                  </div>
                </div>
              </div>

              <Link
                to="/dashboard/ingest"
                className="w-full flex items-center justify-center gap-2 rounded-md border border-border/70 bg-secondary/50 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <span>View Full Ingestion History</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>

          {/* SECTION 4: Where are the Tigers? (Map Preview) */}
          <div className="calm-card rounded-lg p-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
              <h2 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                Where are the Tigers?
              </h2>
              <Link
                to="/dashboard/map"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Open Full Map
              </Link>
            </div>

            <div className="space-y-3">
              <div className="relative h-44 rounded-md overflow-hidden border border-border/40 bg-[oklch(0.12_0.02_155)] flex items-center justify-center">
                {/* Visual stylised radar/terrain background */}
                <div className="absolute inset-0 grid-lines opacity-40"></div>
                <div className="relative text-center p-4 space-y-2">
                  <div className="grid size-10 place-items-center rounded-full bg-primary/15 text-primary mx-auto border border-primary/30">
                    <Compass className="size-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    Pench Reserve Territory Map
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {kpis.active_camera_stations} camera stations · Active tiger ranges
                  </p>
                </div>
              </div>

              <Link
                to="/dashboard/map"
                className="w-full flex items-center justify-center gap-2 rounded-md btn-amber py-2 text-xs font-semibold shadow-xs"
              >
                <Eye className="size-3.5" />
                <span>Open Reserve Map</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
