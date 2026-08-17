import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  UserPlus,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Eye,
  AlertCircle,
  PawPrint,
  Sliders,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { intelligenceService } from "@/lib/services";
import { api } from "@/lib/api/client";
import type { DetectionRecord, TigerProfile } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/review")({
  component: HumanReviewQueuePage,
});

function HumanReviewQueuePage() {
  const [reviewItems, setReviewItems] = useState<DetectionRecord[]>([]);
  const [tigers, setTigers] = useState<TigerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [reassignMap, setReassignMap] = useState<Record<string, string>>({});

  const loadQueue = async () => {
    setLoading(true);
    try {
      const [detRes, tigerList] = await Promise.all([
        intelligenceService.getDetections({ review_only: true, limit: 50 }),
        intelligenceService.getTigers(),
      ]);
      setReviewItems(detRes.items);
      setTigers(tigerList);
    } catch (err) {
      console.warn("Failed to load review queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleDecision = async (
    detectionId: string,
    decision: "CONFIRMED" | "REJECTED" | "REASSIGNED" | "NEW_TIGER",
    correctedTigerId?: string
  ) => {
    setSubmittingId(detectionId);
    try {
      const res = await intelligenceService.verifyDetection(
        detectionId,
        decision,
        correctedTigerId,
        "OFFICER_PATIL",
        `Human officer verified decision: ${decision}`
      );

      toast.success(res.message || `Decision ${decision} recorded in SQLite database.`);

      // Remove from active review queue
      setReviewItems((prev) => prev.filter((item) => item.detection_id !== detectionId));
    } catch (err: any) {
      toast.error(err.message || "Failed to persist human verification decision.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Policy Callout */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Human-in-the-Loop Verification Queue
          </h1>
          <p className="data-chip text-muted-foreground">
            Ambiguous stripe matches staged for officer inspection and authoritative validation
          </p>
        </div>

        <button
          onClick={loadQueue}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          Refresh Queue
        </button>
      </div>

      {/* Review Band Policy Banner */}
      <div className="panel rounded-sm border-amber/40 bg-amber/5 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 shrink-0 text-amber mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-foreground">Review Policy Invariant:</span>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Detections in the medium-confidence similarity interval ([45%, 65%)) are quarantined
              from automated classification and require officer confirmation. Human decisions
              immediately update <span className="font-mono text-foreground">tiger.db</span>,
              recompute movement trajectories, and append an immutable entry to the forensic audit
              trail.
            </p>
          </div>
        </div>
      </div>

      {/* Review Cards List */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Checking for pending ambiguous detections...
          </div>
        ) : reviewItems.length === 0 ? (
          <div className="panel flex flex-col items-center justify-center py-16 text-center rounded-sm">
            <CheckCircle2 className="size-12 text-signal opacity-80" />
            <h3 className="mt-4 font-display text-base font-semibold text-foreground">
              Review Queue Clean
            </h3>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              There are currently no ambiguous tiger detections requiring human confirmation. All
              captured frames have been resolved or triaged.
            </p>
          </div>
        ) : (
          reviewItems.map((item) => {
            const candidateId = item.reid_matched_tiger_id || "Unassigned";
            const candidateTiger = tigers.find((t) => t.tiger_id === candidateId);
            const similarity = item.reid_similarity
              ? Math.round(item.reid_similarity * 100)
              : 52;
            const isSubmitting = submittingId === item.detection_id;

            return (
              <div
                key={item.detection_id}
                className="panel rounded-sm p-6 space-y-5 border-border transition-all hover:border-primary/50"
              >
                {/* Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-sm bg-amber/20 text-amber">
                      <PawPrint className="size-4" />
                    </span>
                    <div>
                      <h3 className="font-mono text-sm font-bold text-foreground">
                        Detection: {item.detection_id}
                      </h3>
                      <p className="font-mono text-xs text-muted-foreground">
                        Station: {item.station_id} · Timestamp: {item.timestamp}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="data-chip rounded-sm border border-amber/40 bg-amber/15 px-2.5 py-1 text-xs font-bold text-amber">
                      {similarity}% Similarity (Ambiguous Band)
                    </span>
                  </div>
                </div>

                {/* Side-by-Side Comparison */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Left: Query Crop */}
                  <div className="rounded-sm border border-border bg-black/40 p-3">
                    <div className="flex items-center justify-between pb-2">
                      <span className="data-chip font-semibold text-primary">
                        1. Query Detection Crop
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Station {item.station_id}
                      </span>
                    </div>
                    <div className="aspect-[16/10] w-full overflow-hidden rounded-sm bg-black">
                      {item.crop_path ? (
                        <img
                          src={api.getImageUrl(item.crop_path)}
                          alt="Query crop"
                          className="size-full object-contain"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                          No query crop
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Candidate Reference Crop */}
                  <div className="rounded-sm border border-border bg-black/40 p-3">
                    <div className="flex items-center justify-between pb-2">
                      <span className="data-chip font-semibold text-signal">
                        2. Reference Match: {candidateId}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Gallery Baseline
                      </span>
                    </div>
                    <div className="aspect-[16/10] w-full overflow-hidden rounded-sm bg-black">
                      {candidateTiger?.reference_image_path ? (
                        <img
                          src={api.getImageUrl(candidateTiger.reference_image_path)}
                          alt="Reference crop"
                          className="size-full object-contain"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                          No reference image available
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Officer Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Reassign Tiger:
                    </span>
                    <select
                      value={reassignMap[item.detection_id] || candidateId}
                      onChange={(e) =>
                        setReassignMap((prev) => ({
                          ...prev,
                          [item.detection_id]: e.target.value,
                        }))
                      }
                      className="h-8 rounded-sm border border-border bg-secondary px-2 text-xs text-foreground focus:border-primary focus:outline-none font-mono"
                    >
                      {tigers.map((t) => (
                        <option key={t.tiger_id} value={t.tiger_id}>
                          {t.tiger_id} ({t.name})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        handleDecision(
                          item.detection_id,
                          "REASSIGNED",
                          reassignMap[item.detection_id] || candidateId
                        )
                      }
                      disabled={isSubmitting}
                      className="rounded-sm border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
                    >
                      Reassign
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() =>
                        handleDecision(item.detection_id, "NEW_TIGER")
                      }
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 rounded-sm border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 disabled:opacity-50"
                    >
                      <UserPlus className="size-3.5 text-primary" />
                      Register New Tiger
                    </button>

                    <button
                      onClick={() =>
                        handleDecision(item.detection_id, "REJECTED")
                      }
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                    >
                      <XCircle className="size-3.5" />
                      Reject Match
                    </button>

                    <button
                      onClick={() =>
                        handleDecision(item.detection_id, "CONFIRMED", candidateId)
                      }
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 rounded-sm btn-amber px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-3.5" />
                      Confirm Match ({candidateId})
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
