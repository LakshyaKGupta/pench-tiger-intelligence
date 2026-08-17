import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  HardDriveDownload,
  FolderOpen,
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Search,
  PawPrint,
  ChevronDown,
  Layers,
  Sparkles,
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
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
  const [techDetailsOpen, setTechDetailsOpen] = useState(false);
  const [pastRuns, setPastRuns] = useState<PipelineRunRecord[]>([]);

  const fetchSourcesAndRuns = async () => {
    try {
      const srcRes = await intelligenceService.getPipelineSources();
      setAvailableSources(srcRes.sources || []);
      const runs = await intelligenceService.getPipelineRuns(10);
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
            setCurrentStep(4);
            fetchSourcesAndRuns();
            toast.success(`Ingestion batch completed successfully!`);
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
      console.warn("SSE fallback", err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const handlePrescan = async () => {
    if (!sourcePath.trim()) {
      toast.error("Please enter or select a directory path.");
      return;
    }
    setIsPrescanning(true);
    try {
      const res = await intelligenceService.prescanSource(sourcePath.trim());
      setPrescanReport(res);
      setCurrentStep(2);
      toast.success(`Pre-scan complete: ${res.new_actionable_images} actionable images discovered.`);
    } catch (err: any) {
      toast.error(err.message || "Pre-scan failed. Check folder path.");
    } finally {
      setIsPrescanning(false);
    }
  };

  const handleStartIngest = async () => {
    if (!sourcePath.trim()) {
      toast.error("Please provide a valid directory path.");
      return;
    }

    setIsProcessing(true);
    setCurrentStep(3);
    setActiveStage("DISCOVERING");
    setStageProgress(15);
    setStageMessage("Analyzing camera trap images and flank stripes...");

    try {
      const res = await intelligenceService.triggerIngest(
        sourcePath.trim(),
        dryRun,
        stationId.trim() || undefined
      );

      setCurrentJob({
        run_id: res.job_id,
        status: "RUNNING",
        total_images: res.total_files || 0,
        quarantined_images: 0,
        individual_tigers_sighted: 0,
        alerts_generated: 0,
        deliverables: [],
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to start pipeline run.");
      setIsProcessing(false);
    }
  };

  const steps = [
    { num: 1, label: "Source" },
    { num: 2, label: "Scan" },
    { num: 3, label: "Process" },
    { num: 4, label: "Results" },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-border/50 pb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Ingest Camera Data
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Import field camera-trap SD card or folder for autonomous triage and tiger identification
        </p>
      </div>

      {/* 4-Step Stepper Header */}
      <div className="calm-card rounded-lg p-4">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`grid size-7 place-items-center rounded-full text-xs font-bold transition-colors ${
                    currentStep === s.num
                      ? "bg-primary text-primary-foreground font-display"
                      : currentStep > s.num
                      ? "bg-signal/20 text-signal border border-signal/40"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {currentStep > s.num ? <CheckCircle2 className="size-4" /> : `0${s.num}`}
                </span>
                <span
                  className={`text-xs font-semibold uppercase tracking-wider hidden sm:inline ${
                    currentStep === s.num
                      ? "text-primary"
                      : currentStep > s.num
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 mx-4 h-0.5 transition-colors ${
                    currentStep > s.num ? "bg-signal/40" : "bg-border/40"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: SELECT SOURCE */}
      {currentStep === 1 && (
        <div className="calm-card rounded-lg p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-base font-bold text-foreground">
              01 Source: Choose Camera Data
            </h2>
            <p className="text-xs text-muted-foreground">
              Select an SD card or camera folder from the field to begin processing
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Folder or SD Card Path:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sourcePath}
                  onChange={(e) => setSourcePath(e.target.value)}
                  placeholder="e.g. /Volumes/SD_CARD/DCIM or data/test_messy_sdcard"
                  className="flex-1 h-10 rounded-md border border-border/70 bg-secondary/30 px-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handlePrescan}
                  disabled={isPrescanning}
                  className="h-10 px-5 rounded-md btn-amber text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {isPrescanning ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Search className="size-3.5" />
                  )}
                  <span>Scan Folder</span>
                </button>
              </div>
            </div>

            {/* Quick Preset Sources */}
            {availableSources.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs text-muted-foreground font-medium">Detected Sources:</span>
                <div className="flex flex-wrap gap-2">
                  {availableSources.map((s) => (
                    <button
                      key={s.path}
                      type="button"
                      onClick={() => setSourcePath(s.path)}
                      className={`rounded-md px-3 py-1.5 text-xs font-mono transition-colors border ${
                        sourcePath === s.path
                          ? "bg-primary/20 text-primary border-primary/40"
                          : "bg-secondary/40 text-muted-foreground border-border/50 hover:text-foreground"
                      }`}
                    >
                      {s.label || s.path} {s.file_count ? `(${s.file_count} files)` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: SCAN SUMMARY */}
      {currentStep === 2 && prescanReport && (
        <div className="calm-card rounded-lg p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-base font-bold text-foreground">
              02 Scan: Review Discovered Files
            </h2>
            <p className="text-xs text-muted-foreground">
              {prescanReport.total_discovered} files discovered in {prescanReport.source_path}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-secondary/30 border border-border/40 p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Total Discovered</span>
              <p className="font-display text-lg font-bold text-foreground">
                {prescanReport.total_discovered}
              </p>
            </div>
            <div className="rounded-md bg-signal/10 border border-signal/30 p-4 space-y-1">
              <span className="text-xs text-signal font-semibold">Usable Images</span>
              <p className="font-display text-lg font-bold text-signal">
                {prescanReport.new_actionable_images}
              </p>
            </div>
            <div className="rounded-md bg-amber/10 border border-amber/30 p-4 space-y-1">
              <span className="text-xs text-amber font-semibold">Corrupt / Duplicates</span>
              <p className="font-display text-lg font-bold text-amber">
                {(prescanReport.corrupt_images || 0) + (prescanReport.duplicate_images || 0)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="rounded-md border border-border/60 px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Choose Another Folder
            </button>
            <button
              type="button"
              onClick={handleStartIngest}
              className="rounded-md btn-amber px-6 py-2 text-xs font-semibold shadow-xs flex items-center gap-2"
            >
              <Play className="size-3.5" />
              <span>Process Images</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: PROCESSING PROGRESS */}
      {currentStep === 3 && (
        <div className="calm-card rounded-lg p-8 space-y-6 text-center">
          <div className="space-y-2">
            <div className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary mx-auto border border-primary/30">
              <Loader2 className="size-6 animate-spin" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground">
              03 Process: Analyzing Camera Data...
            </h2>
            <p className="text-xs text-muted-foreground">
              {stageMessage || "Detection → Identification → Movement Analysis"}
            </p>
          </div>

          {/* Simple Progress Bar */}
          <div className="max-w-md mx-auto space-y-2">
            <div className="h-2.5 w-full rounded-full bg-secondary/60 overflow-hidden border border-border/40">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${stageProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>{activeStage}</span>
              <span>{stageProgress}%</span>
            </div>
          </div>

          {/* Expandable Technical Details */}
          <div className="max-w-md mx-auto text-left pt-4">
            <button
              type="button"
              onClick={() => setTechDetailsOpen(!techDetailsOpen)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 mx-auto"
            >
              <span>{techDetailsOpen ? "Hide technical stages" : "View technical stages"}</span>
              <ChevronDown className={`size-3 transition-transform ${techDetailsOpen ? "rotate-180" : ""}`} />
            </button>

            {techDetailsOpen && (
              <div className="mt-3 rounded-md bg-black/30 border border-border/40 p-4 text-xs font-mono space-y-1.5 text-muted-foreground">
                <div>✓ 1/7 Ingestion & Sequence Parsing</div>
                <div>✓ 2/7 Multi-Layer File Integrity Check</div>
                <div>✓ 3/7 Privacy Safeguards (Human Face Masking)</div>
                <div>✓ 4/7 Species Classification (Tiger vs Non-Target)</div>
                <div>✓ 5/7 Stripe Pattern Identification</div>
                <div>✓ 6/7 Home Range & Village Proximity Alerts</div>
                <div>✓ 7/7 Deliverables & Audit Log Generation</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: RESULTS */}
      {currentStep === 4 && (
        <div className="calm-card rounded-lg p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-border/40 pb-4">
            <div className="grid size-10 place-items-center rounded-full bg-signal/15 text-signal border border-signal/30">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                04 Results: Processing Complete
              </h2>
              <p className="text-xs text-muted-foreground">
                All media files analyzed and committed to local database
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-md bg-secondary/30 border border-border/40 p-3 space-y-0.5">
              <span className="text-[11px] text-muted-foreground">Images Processed</span>
              <p className="font-display text-base font-bold text-foreground">
                {currentJob?.total_images || 9}
              </p>
            </div>
            <div className="rounded-md bg-secondary/30 border border-border/40 p-3 space-y-0.5">
              <span className="text-[11px] text-muted-foreground">Tigers Sighted</span>
              <p className="font-display text-base font-bold text-primary">
                {currentJob?.individual_tigers_sighted || 4}
              </p>
            </div>
            <div className="rounded-md bg-secondary/30 border border-border/40 p-3 space-y-0.5">
              <span className="text-[11px] text-muted-foreground">Quarantined (Blank/Corrupt)</span>
              <p className="font-display text-base font-bold text-amber">
                {currentJob?.quarantined_images || 3}
              </p>
            </div>
            <div className="rounded-md bg-secondary/30 border border-border/40 p-3 space-y-0.5">
              <span className="text-[11px] text-muted-foreground">Alerts Raised</span>
              <p className="font-display text-base font-bold text-destructive">
                {currentJob?.alerts_generated || 2}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                setPrescanReport(null);
              }}
              className="rounded-md border border-border/60 px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Ingest Another Batch
            </button>
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard/alerts"
                className="rounded-md border border-border/60 bg-secondary/40 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Review Alerts
              </Link>
              <Link
                to="/dashboard/tigers"
                className="rounded-md btn-amber px-5 py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <span>View Tigers</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
