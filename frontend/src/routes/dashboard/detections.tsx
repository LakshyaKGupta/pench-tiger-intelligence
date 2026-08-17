import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Camera,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Target,
} from "lucide-react";
import { intelligenceService } from "@/lib/services";
import { api } from "@/lib/api/client";
import type { DetectionRecord } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/detections")({
  component: DetectionCenterPage,
});

function DetectionCenterPage() {
  const [detections, setDetections] = useState<DetectionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [confidenceMin, setConfidenceMin] = useState<number>(0);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedDetection, setSelectedDetection] = useState<DetectionRecord | null>(null);

  const fetchDetections = () => {
    setLoading(true);
    intelligenceService
      .getDetections({
        page,
        limit: 20,
        species: speciesFilter === "all" ? undefined : speciesFilter,
        confidence_min: confidenceMin > 0 ? confidenceMin : undefined,
        review_only: reviewOnly ? true : undefined,
        verified_only: verifiedOnly ? true : undefined,
      })
      .then((res) => {
        setDetections(res.items);
        setTotal(res.total);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("API offline, using cached fallback detections:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDetections();
  }, [page, speciesFilter, confidenceMin, reviewOnly, verifiedOnly]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Detection Center & Forensic Evidence
          </h1>
          <p className="data-chip text-muted-foreground">
            Camera-trap subject detections, MegaDetector triage outputs, and stripe Re-ID scores
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Species Filter */}
          <select
            value={speciesFilter}
            onChange={(e) => {
              setSpeciesFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-sm border border-border bg-secondary/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Species</option>
            <option value="tiger">Tiger (Panthera tigris)</option>
            <option value="leopard">Leopard</option>
            <option value="human">Human / Ranger</option>
            <option value="blank">Blank Frame</option>
          </select>

          {/* Confidence Slider / Selector */}
          <select
            value={confidenceMin}
            onChange={(e) => {
              setConfidenceMin(Number(e.target.value));
              setPage(1);
            }}
            className="h-9 rounded-sm border border-border bg-secondary/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="0">All Confidences</option>
            <option value="0.5">Confidence &gt; 50%</option>
            <option value="0.75">Confidence &gt; 75%</option>
            <option value="0.9">Confidence &gt; 90%</option>
          </select>

          {/* Toggle Review Only */}
          <button
            onClick={() => {
              setReviewOnly(!reviewOnly);
              setVerifiedOnly(false);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-all ${
              reviewOnly
                ? "border-amber/50 bg-amber/20 text-amber"
                : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertCircle className="size-3.5" />
            Needs Review
          </button>

          {/* Toggle Verified Only */}
          <button
            onClick={() => {
              setVerifiedOnly(!verifiedOnly);
              setReviewOnly(false);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-all ${
              verifiedOnly
                ? "border-signal/50 bg-signal/20 text-signal"
                : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="size-3.5" />
            Verified
          </button>
        </div>
      </div>

      {/* Detections Table */}
      <div className="panel overflow-hidden rounded-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/60 text-[11px] font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Crop Preview</th>
                <th className="px-4 py-3">Detection ID</th>
                <th className="px-4 py-3">Station & Zone</th>
                <th className="px-4 py-3">Species</th>
                <th className="px-4 py-3">Re-ID Match</th>
                <th className="px-4 py-3">Similarity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    Loading detection records from database...
                  </td>
                </tr>
              ) : detections.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No detections match the selected criteria.
                  </td>
                </tr>
              ) : (
                detections.map((d) => {
                  const tigerId =
                    d.verified_tiger_id || d.reid_matched_tiger_id || "Unidentified";
                  const similarity = d.reid_similarity
                    ? Math.round(d.reid_similarity * 100)
                    : null;

                  return (
                    <tr
                      key={d.detection_id}
                      className="transition-colors hover:bg-secondary/30"
                    >
                      {/* Crop Preview */}
                      <td className="px-4 py-2.5">
                        <div className="size-10 overflow-hidden rounded-sm border border-border bg-black">
                          {d.crop_path ? (
                            <img
                              src={api.getImageUrl(d.crop_path)}
                              alt="Crop"
                              className="size-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="grid size-full place-items-center text-muted-foreground">
                              <Camera className="size-4" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Detection ID */}
                      <td className="px-4 py-2.5 font-mono font-medium text-foreground">
                        {d.detection_id.length > 22
                          ? `${d.detection_id.slice(0, 20)}…`
                          : d.detection_id}
                      </td>

                      {/* Station */}
                      <td className="px-4 py-2.5">
                        <span className="font-mono font-semibold text-primary">
                          {d.station_id || "STN-UNKNOWN"}
                        </span>
                        {d.zone && (
                          <span className="data-chip ml-1.5 rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {d.zone}
                          </span>
                        )}
                      </td>

                      {/* Species */}
                      <td className="px-4 py-2.5 font-medium capitalize text-foreground">
                        {d.detected_species}
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ({Math.round(d.species_confidence * 100)}%)
                        </span>
                      </td>

                      {/* Re-ID Match */}
                      <td className="px-4 py-2.5">
                        {d.detected_species === "tiger" ? (
                          <span className="font-mono font-bold text-primary">{tigerId}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Similarity */}
                      <td className="px-4 py-2.5">
                        {similarity !== null ? (
                          <span
                            className={`data-chip rounded-sm px-2 py-0.5 font-bold ${
                              similarity >= 65
                                ? "bg-signal/15 text-signal"
                                : similarity >= 45
                                  ? "bg-amber/15 text-amber"
                                  : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {similarity}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2.5">
                        {d.human_verified ? (
                          <span className="data-chip inline-flex items-center gap-1 rounded-sm border border-signal/40 bg-signal/10 px-2 py-0.5 font-semibold text-signal">
                            <CheckCircle2 className="size-3" /> Verified
                          </span>
                        ) : d.reid_confidence_level === "MEDIUM_REVIEW_REQUIRED" ? (
                          <span className="data-chip inline-flex items-center gap-1 rounded-sm border border-amber/40 bg-amber/10 px-2 py-0.5 font-semibold text-amber">
                            <AlertCircle className="size-3" /> Review
                          </span>
                        ) : (
                          <span className="data-chip rounded-sm bg-secondary px-2 py-0.5 text-muted-foreground">
                            Auto
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {d.timestamp || "Recorded"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => setSelectedDetection(d)}
                          className="inline-flex items-center gap-1 rounded-sm border border-border bg-secondary/60 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                        >
                          <Eye className="size-3.5 text-primary" /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-4 py-3 text-xs">
          <span className="text-muted-foreground">
            Showing Page <span className="font-semibold text-foreground">{page}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span> ({total} total)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-sm border border-border px-2.5 py-1 text-xs font-medium disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 rounded-sm border border-border px-2.5 py-1 text-xs font-medium disabled:opacity-40"
            >
              Next <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Detection Inspection Modal */}
      {selectedDetection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-sm border border-border bg-[oklch(0.16_0.012_150)] shadow-2xl">
            {/* Modal Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-2.5">
                <Camera className="size-4.5 text-primary" />
                <h2 className="font-mono text-sm font-bold text-foreground">
                  Detection Evidence: {selectedDetection.detection_id}
                </h2>
              </div>
              <button
                onClick={() => setSelectedDetection(null)}
                className="grid size-7 place-items-center rounded-sm border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Media Views Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="data-chip block mb-1.5 text-muted-foreground">
                    Original Camera-Trap Frame
                  </span>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-border bg-black">
                    <img
                      src={api.getImageUrl(selectedDetection.original_path)}
                      alt="Full frame"
                      className="size-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>

                <div>
                  <span className="data-chip block mb-1.5 text-muted-foreground">
                    Extracted Flank Crop (768-dim Metric Space)
                  </span>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-border bg-black">
                    {selectedDetection.crop_path ? (
                      <img
                        src={api.getImageUrl(selectedDetection.crop_path)}
                        alt="Crop"
                        className="size-full object-contain"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                        No crop localized
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Identification & Re-ID Evidence Breakdown */}
              <div className="panel rounded-sm p-4">
                <h3 className="font-display text-xs font-semibold text-foreground">
                  MegaDescriptor Re-ID Decision Payload
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-sm bg-secondary/60 p-2.5">
                    <span className="text-muted-foreground text-[11px]">Matched Tiger ID:</span>
                    <p className="font-mono text-sm font-bold text-primary mt-0.5">
                      {selectedDetection.verified_tiger_id ||
                        selectedDetection.reid_matched_tiger_id ||
                        "UNIDENTIFIED"}
                    </p>
                  </div>
                  <div className="rounded-sm bg-secondary/60 p-2.5">
                    <span className="text-muted-foreground text-[11px]">Cosine Similarity:</span>
                    <p className="font-mono text-sm font-bold text-signal mt-0.5">
                      {selectedDetection.reid_similarity
                        ? `${(selectedDetection.reid_similarity * 100).toFixed(1)}%`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="rounded-sm bg-secondary/60 p-2.5">
                    <span className="text-muted-foreground text-[11px]">Decision Band:</span>
                    <p className="font-mono text-xs font-semibold text-foreground mt-0.5">
                      {selectedDetection.reid_confidence_level || "AUTO_TRIAGE"}
                    </p>
                  </div>
                </div>

                {selectedDetection.reid_evidence_breakdown?.top_candidates && (
                  <div className="mt-3 border-t border-border pt-2.5">
                    <span className="data-chip text-[10px] text-muted-foreground">
                      Top Candidate Separation Margin:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedDetection.reid_evidence_breakdown.top_candidates.map((cand) => (
                        <span
                          key={cand.tiger_id}
                          className="data-chip rounded-sm bg-secondary px-2 py-1 font-mono text-xs"
                        >
                          {cand.tiger_id}: {(cand.similarity * 100).toFixed(1)}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Station & Audit Telemetry */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="panel rounded-sm p-3.5 space-y-1.5">
                  <span className="text-muted-foreground font-semibold">Camera Station:</span>
                  <p className="font-mono text-foreground font-bold">
                    {selectedDetection.station_id} · Zone {selectedDetection.zone || "Core"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Coordinates: {selectedDetection.latitude?.toFixed(4)},{" "}
                    {selectedDetection.longitude?.toFixed(4)}
                  </p>
                </div>

                <div className="panel rounded-sm p-3.5 space-y-1.5">
                  <span className="text-muted-foreground font-semibold">Verification Audit:</span>
                  <p className="text-foreground">
                    Status:{" "}
                    <span className="font-semibold text-signal">
                      {selectedDetection.human_verified
                        ? `Confirmed by ${selectedDetection.human_actor || "Officer"}`
                        : "Autonomous AI Prediction"}
                    </span>
                  </p>
                  {selectedDetection.human_timestamp && (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      Timestamp: {selectedDetection.human_timestamp}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
