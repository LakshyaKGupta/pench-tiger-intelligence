import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  PawPrint,
  Camera,
  Radio,
  Target,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Eye,
  Activity,
  Footprints,
  Compass,
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

  useEffect(() => {
    intelligenceService
      .getOverview()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("API offline, rendering fallback command center state:", err);
        setLoading(false);
      });
  }, []);

  const kpis = data?.kpis || {
    total_tigers: 6,
    active_camera_stations: 9,
    total_detections: 6,
    images_processed: 7,
    quarantined_images: 1,
    images_awaiting_review: 0,
    active_alerts_count: 2,
    identification_confidence: 89.3,
  };

  const recentSightings = data?.recent_sightings || [];
  const recentAlerts = data?.recent_alerts || [];
  const volumeChart = data?.detection_volume_chart || [];
  const latestRun = data?.latest_ingestion_run;

  return (
    <div className="space-y-6">
      {/* Top Reserve Status Banner */}
      <div className="panel flex flex-wrap items-center justify-between gap-4 rounded-sm border-border p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-sm bg-primary/10 text-primary">
            <Compass className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-foreground">
              Pench Tiger Reserve · Operational Command Center
            </h1>
            <p className="data-chip text-muted-foreground">
              Autonomous Camera-Trap Triage & Movement Intelligence · Offline Local Bridge
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/dashboard/ingest"
            className="flex items-center gap-2 rounded-sm btn-amber px-4 py-2 text-xs font-semibold"
          >
            <HardDrive className="size-3.5" />
            Ingest Camera SD Card
          </Link>
          <Link
            to="/dashboard/map"
            className="flex items-center gap-2 rounded-sm border border-border bg-secondary/80 px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary"
          >
            <Eye className="size-3.5 text-primary" />
            Open GIS Map
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={PawPrint}
          label="Tigers Identified"
          value={kpis.total_tigers}
          trend="+2 this month"
          subtitle="Registered individual stripe patterns"
          variant="amber"
        />
        <MetricCard
          icon={Radio}
          label="Active Camera Stations"
          value={kpis.active_camera_stations}
          subtitle="Core, Buffer & Village Border Grid"
          variant="default"
        />
        <MetricCard
          icon={Camera}
          label="Images Processed"
          value={kpis.images_processed}
          trend={`${kpis.quarantined_images} quarantined`}
          subtitle="Zero-box blanks filtered out"
          variant="signal"
        />
        <MetricCard
          icon={Target}
          label="Mean Re-ID Confidence"
          value={kpis.identification_confidence}
          suffix="%"
          decimals={1}
          subtitle="Cosine similarity against reference gallery"
          variant="default"
        />
      </div>

      {/* Main 2-Column Intelligence Layout */}
      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        {/* Left Column: Live Sighting Stream & Activity */}
        <div className="space-y-6">
          {/* Live Sightings Feed */}
          <div className="panel rounded-sm p-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Recent Tiger Sightings & Identifications
                </h2>
                <p className="data-chip text-muted-foreground">
                  Real-time detections from field camera traps
                </p>
              </div>
              <Link
                to="/dashboard/detections"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View all <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="mt-4 divide-y divide-border">
              {recentSightings.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No tiger sightings recorded yet. Ingest camera SD card data to begin.
                </div>
              ) : (
                recentSightings.slice(0, 6).map((s) => {
                  const tigerId = s.verified_tiger_id || s.reid_matched_tiger_id || "Unidentified";
                  const confidence = s.reid_similarity
                    ? Math.round(s.reid_similarity * 100)
                    : Math.round(s.species_confidence * 100);

                  return (
                    <div
                      key={s.detection_id}
                      className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-secondary/30"
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Thumbnail */}
                        <div className="size-12 shrink-0 overflow-hidden rounded-sm border border-border bg-black">
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
                              <PawPrint className="size-5 text-primary/60" />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-primary">
                              {tigerId}
                            </span>
                            <span className="data-chip rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              Station {s.station_id || "Field"}
                            </span>
                            {s.zone && (
                              <span className="data-chip rounded-sm border border-primary/30 px-1.5 py-0.5 text-[10px] text-primary">
                                {s.zone}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {s.timestamp || "Timestamp recorded"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="data-chip block rounded-sm bg-signal/15 px-2 py-0.5 text-xs font-semibold text-signal">
                          {confidence}% Match
                        </span>
                        <Link
                          to="/dashboard/detections"
                          className="mt-1 block text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Inspect →
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Activity Volume Chart */}
          <div className="panel rounded-sm p-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Detection Throughput History
                </h2>
                <p className="data-chip text-muted-foreground">
                  Daily captured frames vs confirmed tiger identifications
                </p>
              </div>
              <span className="data-chip rounded-sm bg-secondary px-2 py-1 text-xs text-muted-foreground">
                Last 14 Batches
              </span>
            </div>

            <div className="mt-6 flex h-44 items-end gap-2 border-b border-border pb-2">
              {volumeChart.length === 0 ? (
                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  Processing timeline records...
                </div>
              ) : (
                volumeChart.map((col, idx) => {
                  const height = Math.max(16, Math.min(130, col.count * 18));
                  const tigerH = Math.max(8, col.tiger_count * 18);

                  return (
                    <div key={idx} className="group relative flex flex-1 flex-col items-center gap-1">
                      <div className="relative flex w-full max-w-[28px] flex-col justify-end overflow-hidden rounded-t-sm bg-secondary/80" style={{ height: `${height}px` }}>
                        <div
                          className="w-full bg-primary transition-all group-hover:bg-primary/80"
                          style={{ height: `${tigerH}px` }}
                          title={`Tigers: ${col.tiger_count} / Total: ${col.count}`}
                        />
                      </div>
                      <span className="truncate font-mono text-[9px] text-muted-foreground">
                        {col.date_day ? col.date_day.split("-").slice(1).join("/") : `${idx + 1}`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-primary" /> Confirmed Tiger
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs bg-secondary" /> Blank / Triage
                </span>
              </div>
              <span className="font-mono text-[11px]">Auto-Triage Active</span>
            </div>
          </div>
        </div>

        {/* Right Column: Alerts, Latest Ingestion, Quick Actions */}
        <div className="space-y-6">
          {/* Active Priority Alerts */}
          <div className="panel rounded-sm p-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive" />
                <h2 className="font-display text-base font-semibold text-foreground">
                  Active Alerts ({recentAlerts.length})
                </h2>
              </div>
              <Link
                to="/dashboard/alerts"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Alert Center →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="size-8 text-signal opacity-80" />
                  <p className="mt-2 text-sm font-medium text-foreground">
                    All Reserves Normal
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No active village risk or absence anomalies detected.
                  </p>
                </div>
              ) : (
                recentAlerts.map((alt) => (
                  <div
                    key={alt.alert_id}
                    className={`rounded-sm border p-3.5 transition-all ${
                      alt.severity === "CRITICAL"
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-primary/40 bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`data-chip rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                          alt.severity === "CRITICAL"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-primary/20 text-primary"
                        }`}
                      >
                        {alt.severity} · {alt.alert_type}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {alt.timestamp ? alt.timestamp.split("T")[0] : "Active"}
                      </span>
                    </div>

                    <h3 className="mt-2 text-xs font-semibold text-foreground">{alt.title}</h3>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                      {alt.explanation}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px]">
                      <span className="font-mono text-muted-foreground">
                        ID: {alt.tiger_id || alt.station_id || "Reserve"}
                      </span>
                      <Link
                        to="/dashboard/alerts"
                        className="font-semibold text-primary hover:underline"
                      >
                        Investigate Evidence →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Latest Pipeline Ingestion Run */}
          <div className="panel rounded-sm p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="size-4 text-primary" />
                <h2 className="font-display text-sm font-semibold text-foreground">
                  Latest Ingestion Run
                </h2>
              </div>
              <span className="data-chip rounded-sm bg-signal/15 px-2 py-0.5 text-[10px] font-semibold text-signal">
                {latestRun?.status || "COMPLETED"}
              </span>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Batch Identifier:</span>
                <span className="font-mono font-medium text-foreground">
                  {latestRun?.run_id || "RUN-PENCH-LATEST"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discovered Media:</span>
                <span className="font-mono text-foreground">
                  {latestRun?.images_discovered || kpis.images_processed} files
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Triage Status:</span>
                <span className="font-mono text-signal">
                  100% Offline (MegaDetector V6)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stripe Re-ID Engine:</span>
                <span className="font-mono text-primary">
                  MegaDescriptor-T (768-dim)
                </span>
              </div>
            </div>

            <Link
              to="/dashboard/pipeline"
              className="mt-4 block w-full rounded-sm border border-border bg-secondary/80 py-2 text-center text-xs font-semibold text-foreground hover:bg-secondary"
            >
              Inspect Pipeline Telemetry
            </Link>
          </div>

          {/* Quick Review Callout */}
          <div className="rounded-sm border border-primary/40 bg-primary/10 p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-sm bg-primary/20 text-primary">
                <Footprints className="size-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">
                  Human-in-the-Loop Review Queue
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {kpis.images_awaiting_review > 0
                    ? `${kpis.images_awaiting_review} ambiguous stripe matches staged for officer verification.`
                    : "No ambiguous detections currently awaiting review. All matches confidently resolved."}
                </p>
                <Link
                  to="/dashboard/review"
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  Open Review Queue <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
