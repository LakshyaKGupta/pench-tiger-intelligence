import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  FileCheck,
  CheckCircle2,
  HardDrive,
  Target,
  Sparkles,
} from "lucide-react";
import { intelligenceService } from "@/lib/services";

export const Route = createFileRoute("/dashboard/pipeline")({
  component: PipelineHealthPage,
});

function PipelineHealthPage() {
  const [pipelineData, setPipelineData] = useState<{
    engine: string;
    detector_model: string;
    reid_foundation_model: string;
    triage_thresholds: Record<string, number>;
    reid_thresholds: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    intelligenceService
      .getPipelineStatus()
      .then((res) => setPipelineData(res))
      .catch((err) => console.warn("Failed to load pipeline telemetry:", err));
  }, []);

  const stages = [
    {
      step: "01",
      name: "SD-Card Ingestion & Normalization",
      desc: "Recursive directory scan, SHA-256 duplicate hashing, EXIF timestamp & GPS parsing.",
      model: "EXIF / PIL Parser",
      status: "ACTIVE",
    },
    {
      step: "02",
      name: "Evidence-Preserving Triage",
      desc: "MegaDetector V6 subject detection. KEEP (>=0.15), REVIEW ([0.08, 0.15)), QUARANTINE (<0.08).",
      model: "MegaDetector V6 / YOLOv8",
      status: "ACTIVE",
    },
    {
      step: "03",
      name: "Species Classification & BBox",
      desc: "Fine-grained species identification (Tiger vs Leopard vs Prey vs Human).",
      model: "Species Classifier",
      status: "ACTIVE",
    },
    {
      step: "04",
      name: "MegaDescriptor Stripe Pattern Re-ID",
      desc: "768-dim metric feature extraction and cosine distance against tiger reference gallery.",
      model: "MegaDescriptor-T-224",
      status: "ACTIVE",
    },
    {
      step: "05",
      name: "Spatial & Territory Engine",
      desc: "100% Minimum Convex Polygon (MCP) home range calculation and centroid tracking.",
      model: "Graham Scan Hull",
      status: "ACTIVE",
    },
    {
      step: "06",
      name: "Deterministic Alert Engine",
      desc: "Village risk (<2.5 km), Territory shift (>4.0 km), Survey-effort-aware absence (>3x median).",
      model: "AlertEngine v3.2",
      status: "ACTIVE",
    },
    {
      step: "07",
      name: "Forensic Audit & 6 Deliverables",
      desc: "Immutable append-only audit trail and generation of results.json, detections.csv, occupancy.geojson.",
      model: "Structured Exporter",
      status: "ACTIVE",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">
          Pipeline Architecture & System Telemetry
        </h1>
        <p className="data-chip text-muted-foreground">
          Offline multi-stage AI pipeline specifications, active threshold invariants, and model runtimes
        </p>
      </div>

      {/* Engine Status & Invariants Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="panel rounded-sm p-5 border-border space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="size-4.5 text-primary" />
            <h3 className="font-display text-sm font-semibold text-foreground">
              Triage Invariants (config.py)
            </h3>
          </div>
          <div className="mt-3 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">KEEP Threshold:</span>
              <span className="font-bold text-signal">&gt;= 0.15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">REVIEW Band:</span>
              <span className="font-bold text-amber">[0.08, 0.15)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">QUARANTINE (Blank):</span>
              <span className="font-bold text-muted-foreground">&lt; 0.08</span>
            </div>
          </div>
        </div>

        <div className="panel rounded-sm p-5 border-border space-y-2">
          <div className="flex items-center gap-2">
            <Target className="size-4.5 text-primary" />
            <h3 className="font-display text-sm font-semibold text-foreground">
              Re-ID Decision Boundaries
            </h3>
          </div>
          <div className="mt-3 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">CONFIDENT Match:</span>
              <span className="font-bold text-signal">&gt;= 0.65 Cosine</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">REVIEW Queue:</span>
              <span className="font-bold text-amber">[0.45, 0.65)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">NEW Tiger Candidate:</span>
              <span className="font-bold text-primary">&lt; 0.45</span>
            </div>
          </div>
        </div>

        <div className="panel rounded-sm p-5 border-border space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4.5 text-signal" />
            <h3 className="font-display text-sm font-semibold text-foreground">
              Alert Engine Invariants
            </h3>
          </div>
          <div className="mt-3 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Village Risk Radius:</span>
              <span className="font-bold text-destructive">&lt;= 2.5 km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Territory Shift:</span>
              <span className="font-bold text-destructive">&gt;= 4.0 km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Absence Anomaly:</span>
              <span className="font-bold text-destructive">&gt; 3.0x Median</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Stage Visual Flow Pipeline */}
      <div className="panel rounded-sm p-6 space-y-5">
        <h2 className="font-display text-base font-semibold text-foreground">
          Autonomous Camera Trap Processing Stages
        </h2>

        <div className="space-y-3">
          {stages.map((st) => (
            <div
              key={st.step}
              className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-border bg-secondary/30 p-4 transition-all hover:bg-secondary/50"
            >
              <div className="flex items-start gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-primary/10 font-mono text-sm font-bold text-primary">
                  {st.step}
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">{st.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{st.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="data-chip rounded-sm bg-secondary px-2.5 py-1 text-xs font-mono text-foreground">
                  {st.model}
                </span>
                <span className="data-chip rounded-sm bg-signal/15 px-2 py-0.5 text-xs font-semibold text-signal">
                  {st.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
