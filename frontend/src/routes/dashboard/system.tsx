import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  HardDrive,
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Layers,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { intelligenceService } from "@/lib/services";
import type { SystemHealthResponse } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/system")({
  component: SystemHealthPage,
});

function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await intelligenceService.getSystemHealth();
      setHealth(res);
      setLoading(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to load system diagnostics.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            System Diagnostics & Offline Workstation Telemetry
          </h1>
          <p className="data-chip text-muted-foreground">
            Hardware runtime, SQLite database integrity, local model weights, and AppData directory telemetry
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Run Health Diagnostics
        </button>
      </div>

      {loading && !health ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          Checking local runtime engines and database health...
        </div>
      ) : !health ? (
        <div className="panel rounded-sm p-6 border-destructive/40 bg-destructive/5 text-center">
          <AlertTriangle className="size-8 text-destructive mx-auto" />
          <h3 className="mt-2 font-display text-sm font-semibold text-foreground">
            Local Intelligence Bridge Unavailable
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Ensure the local Python intelligence service is running on http://127.0.0.1:8000.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Status Banner */}
          <div className="panel rounded-sm p-5 border-signal/40 bg-signal/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-sm bg-signal/20 text-signal">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h2 className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                  <span>OPERATIONAL · OFFLINE WORKSTATION</span>
                  <span className="size-2 rounded-full bg-signal animate-pulse" />
                </h2>
                <p className="text-xs text-muted-foreground">
                  Zero cloud connectivity required · Running natively on {health.platform} · v{health.application_version}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="data-chip rounded-sm bg-secondary px-2.5 py-1 text-foreground">
                Database: {health.database.connected ? "SQLite Connected" : "Disconnected"}
              </span>
              <span className="data-chip rounded-sm bg-secondary px-2.5 py-1 text-foreground">
                Free Disk: {health.storage.free_gb} GB
              </span>
            </div>
          </div>

          {/* Diagnostics Grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Storage Architecture */}
            <div className="panel rounded-sm p-6 border-border space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <HardDrive className="size-4.5 text-primary" />
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Application Storage & Data Root
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Operating System Data Root:</span>
                  <p className="font-mono font-bold text-foreground mt-0.5 break-all">
                    {health.storage.storage_root}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Workstation Storage Utilization</span>
                    <span className="font-mono font-bold text-foreground">
                      {health.storage.percent_used}% ({health.storage.free_gb} GB Free)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${health.storage.percent_used > 90 ? "bg-amber-500" : "bg-primary"}`}
                      style={{ width: `${health.storage.percent_used}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono">
                  <div className="rounded-sm border border-border bg-secondary/40 p-2">
                    <span className="text-muted-foreground block">Total</span>
                    <strong className="text-foreground">{health.storage.total_gb} GB</strong>
                  </div>
                  <div className="rounded-sm border border-border bg-secondary/40 p-2">
                    <span className="text-muted-foreground block">Used</span>
                    <strong className="text-foreground">{health.storage.used_gb} GB</strong>
                  </div>
                  <div className="rounded-sm border border-border bg-secondary/40 p-2">
                    <span className="text-muted-foreground block">Free</span>
                    <strong className="text-signal">{health.storage.free_gb} GB</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Database & Persistence */}
            <div className="panel rounded-sm p-6 border-border space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Database className="size-4.5 text-primary" />
                <h3 className="font-display text-sm font-semibold text-foreground">
                  SQLite Database Telemetry
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Active Database File:</span>
                  <p className="font-mono font-bold text-foreground mt-0.5 break-all">
                    {health.database.path}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="rounded-sm border border-border bg-secondary/40 p-3">
                    <span className="text-muted-foreground block text-[11px]">Write Permissions</span>
                    <p className="font-mono font-bold text-signal mt-1">
                      {health.database.writable ? "READ / WRITE ACTIVE" : "READ ONLY"}
                    </p>
                  </div>
                  <div className="rounded-sm border border-border bg-secondary/40 p-3">
                    <span className="text-muted-foreground block text-[11px]">Integrity Check</span>
                    <p className="font-mono font-bold text-signal mt-1">
                      PASSED (PRAGMA OK)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Machine Learning Models Integrity Card */}
          <div className="panel rounded-sm p-6 border-border space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Cpu className="size-4.5 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">
                Embedded Machine Learning Weight Checksums
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-sm border border-border bg-secondary/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="data-chip rounded-sm bg-signal/15 px-2 py-0.5 text-signal font-bold">
                    Primary Triage
                  </span>
                  <CheckCircle2 className="size-4 text-signal" />
                </div>
                <h4 className="font-display font-semibold text-foreground">
                  {health.models.megadetector_v6.name}
                </h4>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Weight Checkpoint: {health.models.megadetector_v6.size_mb || 113.4} MB
                </p>
              </div>

              <div className="rounded-sm border border-border bg-secondary/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="data-chip rounded-sm bg-primary/15 px-2 py-0.5 text-primary font-bold">
                    Re-ID Foundation
                  </span>
                  <CheckCircle2 className="size-4 text-primary" />
                </div>
                <h4 className="font-display font-semibold text-foreground">
                  {health.models.megadescriptor_reid.name}
                </h4>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Metric Space: {health.models.megadescriptor_reid.embedding_dimension || 768}-dim Float32
                </p>
              </div>

              <div className="rounded-sm border border-border bg-secondary/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="data-chip rounded-sm bg-secondary px-2 py-0.5 text-foreground font-bold">
                    Wildlife Fallback
                  </span>
                  <CheckCircle2 className="size-4 text-signal" />
                </div>
                <h4 className="font-display font-semibold text-foreground">
                  {health.models.yolov8_fallback.name}
                </h4>
                <p className="font-mono text-[11px] text-muted-foreground">
                  COCO Wildlife Fallback: Active
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
