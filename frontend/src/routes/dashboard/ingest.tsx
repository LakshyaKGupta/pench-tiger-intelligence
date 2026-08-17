import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  HardDriveDownload,
  FolderOpen,
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Cpu,
  Layers,
  Search,
  FileWarning,
  Copy,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { intelligenceService } from "@/lib/services";
import type {
  IngestionRunSummary,
  MediaSourceItem,
  PipelineRunRecord,
  PreScanReport,
} from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/ingest")({
  component: CameraIngestionPage,
});

function CameraIngestionPage() {
  const [sourcePath, setSourcePath] = useState("data/test_messy_sdcard");
  const [stationId, setStationId] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPrescanning, setIsPrescanning] = useState(false);
  const [prescanReport, setPrescanReport] = useState<PreScanReport | null>(null);
  const [availableSources, setAvailableSources] = useState<MediaSourceItem[]>([]);
  const [currentJob, setCurrentJob] = useState<IngestionRunSummary | null>(null);
  const [activeStage, setActiveStage] = useState<string>("IDLE");
  const [stageProgress, setStageProgress] = useState<number>(0);
  const [stageMessage, setStageMessage] = useState<string>("");
  const [pastRuns, setPastRuns] = useState<PipelineRunRecord[]>([]);

  const fetchSourcesAndRuns = async () => {
    try {
      const srcRes = await intelligenceService.getPipelineSources();
      setAvailableSources(srcRes.sources || []);
      const runs = await intelligenceService.getPipelineRuns(20);
      setPastRuns(runs || []);
    } catch (err) {
      console.warn("Failed to fetch sources and runs:", err);
    }
  };

  useEffect(() => {
    fetchSourcesAndRuns();
  }, []);

  // SSE real-time pipeline event listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("http://127.0.0.1:8000/api/pipeline/events");
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "STAGE_CHANGE") {
            setActiveStage(data.stage);
            setStageProgress(Math.round(data.progress * 100));
            setStageMessage(data.message || "");
          } else if (data.type === "RUN_COMPLETED") {
            setActiveStage("COMPLETED");
            setStageProgress(100);
            setIsProcessing(false);
            fetchSourcesAndRuns();
            toast.success(`Ingestion batch ${data.job_id} completed successfully!`);
          } else if (data.type === "RUN_FAILED") {
            setActiveStage("FAILED");
            setIsProcessing(false);
            fetchSourcesAndRuns();
            toast.error(`Ingestion failed: ${data.error}`);
          }
        } catch (e) {
          // ignore heartbeat parsing
        }
      };
    } catch (err) {
      console.warn("SSE connection not established, falling back to polling", err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const handlePrescan = async () => {
    if (!sourcePath.trim()) {
      toast.error("Please enter a media directory path to pre-scan.");
      return;
    }
    setIsPrescanning(true);
    try {
      const res = await intelligenceService.prescanSource(sourcePath.trim());
      setPrescanReport(res);
      toast.success(
        `Pre-scan complete: ${res.new_actionable_images} actionable images discovered (${res.total_mb} MB).`
      );
    } catch (err: any) {
      toast.error(err.message || "Pre-scan failed. Check folder path.");
    } finally {
      setIsPrescanning(false);
    }
  };

  const handleStartIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcePath.trim()) {
      toast.error("Please provide a valid SD card directory path.");
      return;
    }

    setIsProcessing(true);
    setActiveStage("DISCOVERING");
    setStageProgress(10);
    setStageMessage("Initializing pipeline and indexing candidate files...");

    try {
      const res = await intelligenceService.triggerIngest(
        sourcePath.trim(),
        dryRun,
        stationId.trim() || undefined
      );

      setCurrentJob({
        run_id: res.job_id,
        status: "RUNNING",
        source_type: "SD_CARD",
        source_path: sourcePath,
        images_discovered: res.images_discovered,
      });

      toast.success(
        `Ingestion job ${res.job_id} launched. Discovered ${res.images_discovered} camera-trap files.`
      );
    } catch (err: any) {
      setIsProcessing(false);
      toast.error(err.message || "Failed to launch ingestion job.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">
          Camera-Trap Ingestion Engine & SD Card Triage
        </h1>
        <p className="data-chip text-muted-foreground">
          Automated multi-layer validation, SHA-256 deduplication, blank triage, and stripe pattern Re-ID
        </p>
      </div>

      {/* Ingestion Launcher Panel */}
      <div className="panel rounded-sm p-6 border-border space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="size-5 text-primary" />
            <h2 className="font-display text-base font-semibold text-foreground">
              Configure Source Media Directory
            </h2>
          </div>

          {availableSources.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mounted Volumes:</span>
              <div className="flex items-center gap-1.5">
                {availableSources.map((src) => (
                  <button
                    key={src.path}
                    type="button"
                    onClick={() => setSourcePath(src.path)}
                    className="data-chip rounded-sm bg-secondary px-2.5 py-1 text-xs text-foreground hover:border-primary hover:text-primary transition-all border border-border"
                  >
                    📁 {src.name} {src.has_dcim ? "(DCIM)" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleStartIngest} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground">
                SD Card Mount or Local Media Path:
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={sourcePath}
                  onChange={(e) => setSourcePath(e.target.value)}
                  placeholder="e.g. data/test_messy_sdcard or /Volumes/TIGER_SD"
                  className="h-10 flex-1 rounded-sm border border-border bg-secondary/80 px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handlePrescan}
                  disabled={isPrescanning || isProcessing}
                  className="flex items-center gap-1.5 rounded-sm border border-border bg-secondary/80 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
                >
                  {isPrescanning ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5 text-primary" />}
                  Pre-Scan
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Recursively scans for .JPG, .JPEG, .PNG camera trap images.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground">
                Default Camera Station Override (Optional):
              </label>
              <input
                type="text"
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                placeholder="e.g. STN04 or leave blank for EXIF extraction"
                className="mt-1.5 h-10 w-full rounded-sm border border-border bg-secondary/80 px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Auto-extracted from folder names or EXIF if omitted.
              </p>
            </div>
          </div>

          {/* Pre-Scan Diagnostic Report Card */}
          {prescanReport && (
            <div className="rounded-sm border border-border bg-secondary/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-foreground">
                  Pre-Scan Inspection: {prescanReport.source_type}
                </span>
                <span className="data-chip rounded-sm bg-primary/20 px-2 py-0.5 text-xs text-primary font-mono font-bold">
                  {prescanReport.new_actionable_images} Actionable Media Files ({prescanReport.total_mb} MB)
                </span>
              </div>

              <div className="grid gap-2 grid-cols-2 sm:grid-cols-5 text-xs">
                <div className="rounded-sm border border-border bg-secondary/60 p-2.5">
                  <span className="text-[10px] text-muted-foreground">Discovered</span>
                  <p className="font-mono font-bold text-foreground mt-0.5">{prescanReport.total_discovered} files</p>
                </div>
                <div className="rounded-sm border border-border bg-secondary/60 p-2.5">
                  <span className="text-[10px] text-muted-foreground">Supported Images</span>
                  <p className="font-mono font-bold text-signal mt-0.5">{prescanReport.supported_images} JPG/PNG</p>
                </div>
                <div className="rounded-sm border border-border bg-secondary/60 p-2.5">
                  <span className="text-[10px] text-muted-foreground">SHA-256 Duplicates</span>
                  <p className="font-mono font-bold text-muted-foreground mt-0.5">{prescanReport.duplicate_images} skipped</p>
                </div>
                <div className="rounded-sm border border-border bg-secondary/60 p-2.5">
                  <span className="text-[10px] text-muted-foreground">Corrupt Headers</span>
                  <p className={`font-mono font-bold mt-0.5 ${prescanReport.corrupt_images > 0 ? "text-destructive" : "text-signal"}`}>
                    {prescanReport.corrupt_images} files
                  </p>
                </div>
                <div className="rounded-sm border border-border bg-secondary/60 p-2.5">
                  <span className="text-[10px] text-muted-foreground">Actionable Batch</span>
                  <p className="font-mono font-bold text-primary mt-0.5">{prescanReport.new_actionable_images} images</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
            <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="size-4 rounded-xs border-border bg-secondary text-primary focus:ring-0"
              />
              <span>Dry Run Mode (Simulate without writing new image crops)</span>
            </label>

            <button
              type="submit"
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-sm btn-amber px-6 py-2.5 text-xs font-semibold disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing Ingestion Pipeline...
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Start Ingestion Pipeline
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Real-time Ingestion Progress Card */}
      {(isProcessing || activeStage !== "IDLE") && (
        <div className="panel rounded-sm p-6 border-primary/40 bg-primary/5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-sm bg-primary/20 text-primary">
                <Cpu className="size-4" />
              </span>
              <div>
                <h3 className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                  <span>Pipeline Execution Stream</span>
                  <span className="size-2 rounded-full bg-signal animate-ping" />
                </h3>
                <p className="text-xs text-muted-foreground">
                  Stage: <strong className="text-foreground">{activeStage}</strong> · {stageMessage}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-sm font-bold text-primary">{stageProgress}%</span>
              <p className="text-[10px] text-muted-foreground">Real-Time SSE</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${stageProgress}%` }}
            />
          </div>

          {/* 10-Stage State Machine Indicator */}
          <div className="grid gap-2 sm:grid-cols-5 text-xs">
            <div className={`rounded-sm border p-2.5 ${activeStage === "DISCOVERING" ? "border-primary bg-primary/20" : "border-border bg-secondary/60"}`}>
              <span className="text-muted-foreground text-[10px]">1. Discovery</span>
              <p className="font-mono font-bold text-foreground text-[11px] mt-0.5">SHA-256 Dedup</p>
            </div>
            <div className={`rounded-sm border p-2.5 ${activeStage === "TRIAGE_AND_DETECTION" ? "border-primary bg-primary/20" : "border-border bg-secondary/60"}`}>
              <span className="text-muted-foreground text-[10px]">2. MegaDetector V6</span>
              <p className="font-mono font-bold text-signal text-[11px] mt-0.5">Blank Quarantine</p>
            </div>
            <div className={`rounded-sm border p-2.5 ${activeStage === "TRIAGE_AND_DETECTION" ? "border-primary bg-primary/20" : "border-border bg-secondary/60"}`}>
              <span className="text-muted-foreground text-[10px]">3. Flank Cropper</span>
              <p className="font-mono font-bold text-foreground text-[11px] mt-0.5">Tiger Extraction</p>
            </div>
            <div className={`rounded-sm border p-2.5 ${activeStage === "ALERTS_AND_FINALIZING" ? "border-primary bg-primary/20" : "border-border bg-secondary/60"}`}>
              <span className="text-muted-foreground text-[10px]">4. MegaDescriptor Re-ID</span>
              <p className="font-mono font-bold text-primary text-[11px] mt-0.5">768-dim Metric</p>
            </div>
            <div className={`rounded-sm border p-2.5 ${activeStage === "COMPLETED" ? "border-signal bg-signal/20" : "border-border bg-secondary/60"}`}>
              <span className="text-muted-foreground text-[10px]">5. Ecological Alerts</span>
              <p className="font-mono font-bold text-foreground text-[11px] mt-0.5">MCP & Absence</p>
            </div>
          </div>
        </div>
      )}

      {/* Past Ingestion Runs Table */}
      <div className="panel overflow-hidden rounded-sm">
        <div className="border-b border-border bg-secondary/40 px-5 py-3.5 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-foreground">
            Historical Ingestion Batches ({pastRuns.length})
          </h3>
          <button
            onClick={fetchSourcesAndRuns}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/60 text-[11px] font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Batch Run ID</th>
                <th className="px-4 py-3">Source Type</th>
                <th className="px-4 py-3">Discovered</th>
                <th className="px-4 py-3">Processed</th>
                <th className="px-4 py-3">Tigers Sighted</th>
                <th className="px-4 py-3">Review Queue</th>
                <th className="px-4 py-3">Alerts</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pastRuns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    No historical ingestion runs recorded in SQLite.
                  </td>
                </tr>
              ) : (
                pastRuns.map((run) => (
                  <tr key={run.run_id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{run.run_id}</td>
                    <td className="px-4 py-3 font-mono">{run.source_type}</td>
                    <td className="px-4 py-3 font-mono">{run.images_discovered} files</td>
                    <td className="px-4 py-3 font-mono">{run.images_processed || run.images_discovered}</td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">{run.tigers_detected || 0}</td>
                    <td className="px-4 py-3 font-mono text-signal">{run.review_required || 0}</td>
                    <td className="px-4 py-3 font-mono text-destructive">{run.alerts_generated || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`data-chip rounded-sm px-2 py-0.5 font-bold ${
                        run.status === "COMPLETED" ? "bg-signal/15 text-signal" : run.status === "FAILED" ? "bg-destructive/20 text-destructive" : "bg-primary/15 text-primary"
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {run.started_at ? run.started_at.split("T")[0] : "Recent"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
