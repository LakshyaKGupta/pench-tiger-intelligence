import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Radio,
  PawPrint,
  X,
  ChevronDown,
  Info,
  Check,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { intelligenceService } from "@/lib/services";
import type { AlertRecord } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/alerts")({
  component: AlertCenterPage,
});

function AlertCenterPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  // Action dialog state
  const [actionAlert, setActionAlert] = useState<AlertRecord | null>(null);
  const [actionType, setActionType] = useState<"ACKNOWLEDGE" | "RESOLVE" | "FALSE_POSITIVE">("ACKNOWLEDGE");
  const [actionNote, setActionNote] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchAlerts = () => {
    setLoading(true);
    intelligenceService
      .getAlerts({ active_only: false })
      .then((res) => {
        setAlerts(res);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load alerts:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleExecuteAction = async () => {
    if (!actionAlert) return;
    if (!actionNote.trim()) {
      toast.error("Please enter an officer note for the audit log.");
      return;
    }

    setActionSubmitting(true);
    try {
      if (actionType === "ACKNOWLEDGE") {
        await intelligenceService.acknowledgeAlert(actionAlert.alert_id, "OFFICER_PATIL", actionNote);
        toast.success(`Alert acknowledged.`);
      } else if (actionType === "RESOLVE") {
        await intelligenceService.resolveAlert(actionAlert.alert_id, "OFFICER_PATIL", actionNote);
        toast.success(`Alert marked resolved.`);
      } else if (actionType === "FALSE_POSITIVE") {
        await intelligenceService.markFalsePositive(actionAlert.alert_id, "OFFICER_PATIL", actionNote);
        toast.success(`Alert marked false positive.`);
      }

      setActionAlert(null);
      setActionNote("");
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.message || "Failed to update alert state.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "ACTIVE") return !a.is_dismissed && (a.status === "OPEN" || a.status === "ACKNOWLEDGED" || !a.status);
    if (statusFilter === "RESOLVED") return a.is_dismissed || a.status === "RESOLVED";
    return a.status === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Alerts & Ecological Anomalies
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Movement boundary breaches, territory shifts, and village risk notifications
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {(["all", "ACTIVE", "RESOLVED"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === filter
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "bg-secondary/40 text-muted-foreground border border-border/50 hover:text-foreground"
              }`}
            >
              {filter === "all" ? "All Alerts" : filter === "ACTIVE" ? "Active" : "Resolved"}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Feed */}
      {loading ? (
        <div className="py-24 text-center text-xs text-muted-foreground">
          Loading alerts from tiger.db...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="calm-card rounded-lg p-12 text-center space-y-3">
          <CheckCircle2 className="size-8 text-signal mx-auto" />
          <h3 className="font-display text-sm font-semibold text-foreground">
            No alerts found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {statusFilter === "ACTIVE"
              ? "All pending alerts have been addressed and resolved."
              : "No alert records match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const isCritical = alert.severity === "CRITICAL";
            const isResolved = alert.is_dismissed || alert.status === "RESOLVED";
            const isExpanded = expandedAlertId === alert.alert_id;
            const evidence = alert.evidence_data || {};

            return (
              <div
                key={alert.alert_id}
                className={`calm-card rounded-lg p-5 transition-all space-y-4 ${
                  isCritical && !isResolved
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border/40"
                }`}
              >
                {/* Top Alert Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isCritical
                            ? "bg-destructive/20 text-destructive border border-destructive/30"
                            : "bg-amber/20 text-amber border border-amber/30"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <h3 className="font-display text-sm font-bold text-foreground">
                        {alert.title || alert.alert_type}
                      </h3>
                      {alert.tiger_id && (
                        <span className="rounded bg-secondary/70 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {alert.tiger_id}
                        </span>
                      )}
                      {isResolved && (
                        <span className="rounded bg-signal/15 px-2 py-0.5 text-[10px] font-semibold text-signal border border-signal/20">
                          Resolved
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {alert.explanation}
                    </p>
                  </div>

                  {/* Date/Time */}
                  <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                    {alert.timestamp ? new Date(alert.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                  </span>
                </div>

                {/* Evidence Summary & Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => setExpandedAlertId(isExpanded ? null : alert.alert_id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Info className="size-3.5" />
                    <span>{isExpanded ? "Hide detailed evidence" : "Why this alert was raised"}</span>
                    <ChevronDown className={`size-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {/* Directed Actions */}
                  {!isResolved ? (
                    <div className="flex items-center gap-2">
                      {alert.status !== "ACKNOWLEDGED" && (
                        <button
                          onClick={() => {
                            setActionAlert(alert);
                            setActionType("ACKNOWLEDGE");
                            setActionNote("Acknowledged by Range Officer.");
                          }}
                          className="rounded-md bg-secondary/70 hover:bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors border border-border/50"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setActionAlert(alert);
                          setActionType("RESOLVE");
                          setActionNote("Patrol verified and resolved.");
                        }}
                        className="rounded-md btn-amber px-3 py-1.5 text-xs font-semibold shadow-xs"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => {
                          setActionAlert(alert);
                          setActionType("FALSE_POSITIVE");
                          setActionNote("Reviewed: False anomaly.");
                        }}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        False Positive
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="size-3.5 text-signal" />
                      <span>Closed by {alert.resolved_by || "Officer"}</span>
                    </div>
                  )}
                </div>

                {/* Expandable "Why this alert was raised" */}
                {isExpanded && (
                  <div className="rounded-md bg-secondary/40 p-4 border border-border/50 space-y-3.5 text-xs">
                    <div>
                      <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">
                        1. What Happened
                      </span>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">
                        {alert.explanation || "An ecological movement or boundary anomaly was detected during autonomous camera data processing."}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">
                        2. Why It Matters
                      </span>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">
                        {alert.severity === "CRITICAL"
                          ? "Movement near human habitation creates potential conflict risk or indicates territorial displacement."
                          : "Changes in regular movement patterns help track dispersal, health, and territory stability across Pench."}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">
                        3. Field Evidence
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1.5">
                        {evidence.shift_km !== undefined && (
                          <div className="rounded bg-black/20 p-2 border border-border/30">
                            <span className="text-muted-foreground text-[10px] block">Distance From Normal Range:</span>
                            <span className="font-semibold text-foreground font-mono">{evidence.shift_km} km</span>
                          </div>
                        )}
                        {evidence.station || alert.station_id ? (
                          <div className="rounded bg-black/20 p-2 border border-border/30">
                            <span className="text-muted-foreground text-[10px] block">Camera Station:</span>
                            <span className="font-semibold text-foreground font-mono">{evidence.station || alert.station_id}</span>
                          </div>
                        ) : null}
                        {evidence.reid_similarity !== undefined && (
                          <div className="rounded bg-black/20 p-2 border border-border/30">
                            <span className="text-muted-foreground text-[10px] block">Identification Confidence:</span>
                            <span className="font-semibold text-signal font-mono">{(evidence.reid_similarity * 100).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">
                        4. What You Can Do
                      </span>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">
                        Verify patrol records for station {evidence.station || alert.station_id || "the reported area"}, notify range field staff if near boundary, and acknowledge or resolve this alert.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action Dialog */}
      {actionAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="calm-card w-full max-w-md rounded-lg p-6 space-y-4 shadow-2xl border border-border/80 bg-[oklch(0.16_0.014_155)]">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-foreground">
                {actionType === "ACKNOWLEDGE"
                  ? "Acknowledge Alert"
                  : actionType === "RESOLVE"
                  ? "Resolve Alert"
                  : "Mark False Positive"}
              </h3>
              <button
                onClick={() => setActionAlert(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              {actionAlert.title || actionAlert.alert_type} ({actionAlert.tiger_id})
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Officer Justification Note:
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Enter field notes for the official audit log..."
                className="w-full h-24 rounded-md border border-border/70 bg-secondary/40 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActionAlert(null)}
                className="rounded-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={actionSubmitting}
                className="rounded-md btn-amber px-4 py-1.5 text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {actionSubmitting ? "Updating..." : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
