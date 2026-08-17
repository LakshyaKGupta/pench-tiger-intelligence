import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  UserPlus,
  RefreshCw,
  PawPrint,
  ChevronDown,
  Sparkles,
  Layers,
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
  const [expandedTechId, setExpandedTechId] = useState<string | null>(null);

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

      toast.success(res.message || `Decision recorded in local database.`);
      setReviewItems((prev) => prev.filter((item) => item.detection_id !== detectionId));
    } catch (err: any) {
      toast.error(err.message || "Failed to persist human verification decision.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Human Review Queue
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Authoritative officer validation for ambiguous or novel stripe patterns
          </p>
        </div>

        <button
          onClick={loadQueue}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors self-start sm:self-center"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Review Cards List */}
      {loading ? (
        <div className="py-24 text-center text-xs text-muted-foreground">
          Checking for pending review items...
        </div>
      ) : reviewItems.length === 0 ? (
        <div className="calm-card rounded-lg p-12 text-center space-y-3">
          <CheckCircle2 className="size-8 text-signal mx-auto" />
          <h3 className="font-display text-sm font-semibold text-foreground">
            Review Queue Clean
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            There are currently no ambiguous detections requiring manual confirmation. All captures have been categorized with high confidence.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviewItems.map((item) => {
            const candidateId = item.reid_matched_tiger_id || "Unassigned";
            const candidateTiger = tigers.find((t) => t.tiger_id === candidateId);
            const similarity = item.reid_similarity
              ? Math.round(item.reid_similarity * 100)
              : Math.round(item.species_confidence * 100);
            const isSubmitting = submittingId === item.detection_id;
            const isTechOpen = expandedTechId === item.detection_id;

            return (
              <div key={item.detection_id} className="calm-card rounded-lg p-6 space-y-6">
                {/* Photo & Candidate Comparison Grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Unverified Crop */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-foreground block">
                      Captured Field Detection
                    </span>
                    <div className="aspect-[16/10] w-full rounded-md overflow-hidden bg-black/40 border border-border/50">
                      {item.crop_path ? (
                        <img
                          src={api.getImageUrl(item.crop_path)}
                          alt="Unverified candidate"
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <PawPrint className="size-8 text-primary/30" />
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      Station: {item.station_id || "STN"} · Time: {item.timestamp || "Recent"}
                    </div>
                  </div>

                  {/* Candidate Tiger Reference */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Possible Match: <strong className="text-primary">{candidateId}</strong>
                      </span>
                      <span className="rounded bg-amber/15 px-2 py-0.2 text-[11px] font-bold text-amber border border-amber/30">
                        {similarity}% Confidence
                      </span>
                    </div>

                    <div className="aspect-[16/10] w-full rounded-md overflow-hidden bg-black/40 border border-border/50">
                      {candidateTiger?.reference_image_path ? (
                        <img
                          src={api.getImageUrl(candidateTiger.reference_image_path)}
                          alt={candidateTiger.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <PawPrint className="size-8 text-primary/30" />
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      Reference Gallery: {candidateTiger?.name || candidateId}
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30">
                  <button
                    onClick={() => handleDecision(item.detection_id, "CONFIRMED", candidateId)}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 rounded-md btn-amber px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Confirm Match ({candidateId})</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={reassignMap[item.detection_id] || ""}
                      onChange={(e) =>
                        setReassignMap((prev) => ({
                          ...prev,
                          [item.detection_id]: e.target.value,
                        }))
                      }
                      className="h-8.5 rounded-md border border-border/70 bg-secondary/40 px-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="">Reassign to...</option>
                      {tigers
                        .filter((t) => t.tiger_id !== candidateId)
                        .map((t) => (
                          <option key={t.tiger_id} value={t.tiger_id}>
                            {t.tiger_id} ({t.name})
                          </option>
                        ))}
                    </select>

                    <button
                      onClick={() => {
                        const targetTiger = reassignMap[item.detection_id];
                        if (!targetTiger) {
                          toast.error("Please select a target tiger from dropdown.");
                          return;
                        }
                        handleDecision(item.detection_id, "REASSIGNED", targetTiger);
                      }}
                      disabled={isSubmitting || !reassignMap[item.detection_id]}
                      className="rounded-md border border-border/60 bg-secondary/60 hover:bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors disabled:opacity-50"
                    >
                      Reassign
                    </button>
                  </div>

                  <button
                    onClick={() => handleDecision(item.detection_id, "REJECTED")}
                    disabled={isSubmitting}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto"
                  >
                    Not a Tiger
                  </button>
                </div>

                {/* Expandable Technical Details */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTechId(isTechOpen ? null : item.detection_id)
                    }
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Layers className="size-3" />
                    <span>{isTechOpen ? "Hide technical evidence" : "Technical confidence breakdown"}</span>
                    <ChevronDown className={`size-3 transition-transform ${isTechOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isTechOpen && (
                    <div className="mt-2 p-3 rounded-md bg-black/20 border border-border/40 font-mono text-xs text-muted-foreground space-y-1">
                      <div>Detection ID: {item.detection_id}</div>
                      <div>Species Confidence: {Math.round(item.species_confidence * 100)}%</div>
                      <div>MegaDescriptor Cosine Distance: {item.reid_similarity?.toFixed(4) || "N/A"}</div>
                      <div>Triage Status: Human Review Required ([0.08, 0.15) band)</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
