import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Radio,
  PawPrint,
  Compass,
  ArrowRight,
  Eye,
  X,
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
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null);
  const [actionAlert, setActionAlert] = useState<AlertRecord | null>(null);
  const [actionType, setActionType] = useState<"ACKNOWLEDGE" | "RESOLVE" | "FALSE_POSITIVE" | "SUPPRESS">("ACKNOWLEDGE");
  const [officerActor, setOfficerActor] = useState("OFFICER_PATIL");
  const [actionNote, setActionNote] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchAlerts = () => {
    setLoading(true);
    intelligenceService
      .getAlerts({
        severity: severityFilter === "all" ? undefined : severityFilter,
        alert_type: typeFilter === "all" ? undefined : typeFilter,
        active_only: false,
      })
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
  }, [severityFilter, typeFilter]);

  const handleExecuteAction = async () => {
    if (!actionAlert) return;
    if (!actionNote.trim()) {
      toast.error("Please enter an officer justification note for the audit trail.");
      return;
    }

    setActionSubmitting(true);
    try {
      if (actionType === "ACKNOWLEDGE") {
        await intelligenceService.acknowledgeAlert(actionAlert.alert_id, officerActor, actionNote);
        toast.success(`Alert ${actionAlert.alert_id} acknowledged.`);
      } else if (actionType === "RESOLVE") {
        await intelligenceService.resolveAlert(actionAlert.alert_id, officerActor, actionNote);
        toast.success(`Alert ${actionAlert.alert_id} marked resolved.`);
      } else if (actionType === "FALSE_POSITIVE") {
        await intelligenceService.markFalsePositive(actionAlert.alert_id, officerActor, actionNote);
        toast.success(`Alert ${actionAlert.alert_id} marked as false positive.`);
      } else if (actionType === "SUPPRESS") {
        await intelligenceService.suppressAlert(actionAlert.alert_id, officerActor, actionNote);
        toast.success(`Alert ${actionAlert.alert_id} suppressed.`);
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

  const activeAlerts = filteredAlerts.filter((a) => !a.is_dismissed);
  const resolvedAlerts = filteredAlerts.filter((a) => a.is_dismissed);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Explainable Ecological & Movement Alert Center
          </h1>
          <p className="data-chip text-muted-foreground">
            Deterministic anomaly triggers: Village proximity, centroid shift, and survey-effort-aware prolonged absence
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-sm border border-border bg-secondary/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Alert States</option>
            <option value="ACTIVE">Active (Open & Acknowledged)</option>
            <option value="OPEN">Open Only</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved / Dismissed</option>
            <option value="FALSE_POSITIVE">False Positive</option>
            <option value="SUPPRESSED">Suppressed</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-9 rounded-sm border border-border bg-secondary/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-sm border border-border bg-secondary/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Alert Types</option>
            <option value="VILLAGE_RISK">Village Risk (&lt;2.5 km)</option>
            <option value="RANGE_SHIFT">Territory Shift (&gt;4.0 km)</option>
            <option value="BUFFER_PROXIMITY">Buffer Proximity (&lt;2.0 km)</option>
            <option value="PROLONGED_ABSENCE">Prolonged Absence (&gt;3x Median)</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Loading active alerts from SQLite database...
          </div>
        ) : activeAlerts.length === 0 && resolvedAlerts.length === 0 ? (
          <div className="panel flex flex-col items-center justify-center py-16 text-center rounded-sm">
            <CheckCircle2 className="size-12 text-signal opacity-80" />
            <h3 className="mt-4 font-display text-base font-semibold text-foreground">
              Zero Actionable Alerts
            </h3>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              All camera stations and registered individuals are within normal ecological
              parameters.
            </p>
          </div>
        ) : (
          <>
            {/* Active Alerts */}
            <div className="space-y-3">
              {activeAlerts.map((alt) => (
                <div
                  key={alt.alert_id}
                  className={`panel rounded-sm p-5 border-l-4 transition-all ${
                    alt.severity === "CRITICAL"
                      ? "border-l-destructive border-border bg-destructive/5"
                      : "border-l-primary border-border bg-primary/5"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`data-chip rounded-sm px-2 py-0.5 text-xs font-bold ${
                          alt.severity === "CRITICAL"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-primary/20 text-primary"
                        }`}
                      >
                        {alt.severity} · {alt.alert_type}
                      </span>
                      <span className="data-chip rounded-sm bg-secondary px-2 py-0.5 text-[11px] font-mono text-foreground">
                        Status: {alt.status || "OPEN"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {alt.alert_id}
                      </span>
                    </div>

                    <span className="font-mono text-xs text-muted-foreground">
                      {alt.timestamp}
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-sm font-bold text-foreground">
                    {alt.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {alt.explanation}
                  </p>

                  {alt.resolution_notes && (
                    <div className="mt-2 rounded-sm border border-border/80 bg-secondary/50 p-2.5 text-xs">
                      <span className="font-semibold text-foreground">Officer Note ({alt.resolved_by || "Patil"}):</span>{" "}
                      <span className="text-muted-foreground italic">"{alt.resolution_notes}"</span>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs">
                    <div className="flex items-center gap-3 font-mono text-muted-foreground">
                      {alt.tiger_id && <span>Individual: <strong className="text-primary">{alt.tiger_id}</strong></span>}
                      {alt.station_id && <span>Station: <strong className="text-foreground">{alt.station_id}</strong></span>}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAlert(alt)}
                        className="flex items-center gap-1 rounded-sm border border-border bg-secondary/80 px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                      >
                        <Eye className="size-3.5 text-primary" /> Inspect Evidence
                      </button>

                      <button
                        onClick={() => {
                          setActionAlert(alt);
                          setActionType("ACKNOWLEDGE");
                          setActionNote("");
                        }}
                        className="flex items-center gap-1 rounded-sm border border-border bg-secondary/40 px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        <Clock className="size-3.5 text-primary" /> Acknowledge
                      </button>

                      <button
                        onClick={() => {
                          setActionAlert(alt);
                          setActionType("RESOLVE");
                          setActionNote("");
                        }}
                        className="flex items-center gap-1 rounded-sm border border-signal/40 bg-signal/10 px-3 py-1 text-xs font-semibold text-signal hover:bg-signal/20"
                      >
                        <CheckCircle2 className="size-3.5" /> Resolve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resolved Alerts Accordion */}
            {resolvedAlerts.length > 0 && (
              <div className="mt-8 border-t border-border pt-6">
                <h3 className="font-display text-sm font-semibold text-muted-foreground mb-3">
                  Resolved & Archived Alerts ({resolvedAlerts.length})
                </h3>
                <div className="space-y-2 opacity-75">
                  {resolvedAlerts.map((alt) => (
                    <div
                      key={alt.alert_id}
                      className="rounded-sm border border-border bg-secondary/20 p-3 text-xs flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-foreground">{alt.title}</span>
                        <span className="ml-2 font-mono text-muted-foreground">({alt.alert_id})</span>
                        {alt.resolution_notes && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground italic">
                            Resolved by {alt.resolved_by || "Officer"}: "{alt.resolution_notes}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="data-chip rounded-sm bg-secondary px-2 py-0.5 text-[10px] font-mono">
                          {alt.status || "RESOLVED"}
                        </span>
                        <button
                          onClick={() => setSelectedAlert(alt)}
                          className="flex items-center gap-1 rounded-sm border border-border bg-secondary/60 px-2 py-0.5 text-[11px] hover:bg-secondary"
                        >
                          <Eye className="size-3 text-primary" /> Evidence
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Officer Lifecycle Action Dialog */}
      {actionAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-sm border border-border bg-[oklch(0.16_0.012_150)] shadow-2xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4.5 text-primary" />
                <h2 className="font-mono text-sm font-bold text-foreground">
                  Officer Action: {actionAlert.alert_id}
                </h2>
              </div>
              <button
                onClick={() => setActionAlert(null)}
                className="grid size-7 place-items-center rounded-sm border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType("ACKNOWLEDGE")}
                    className={`rounded-sm border p-2 text-center font-semibold transition-all ${
                      actionType === "ACKNOWLEDGE"
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType("RESOLVE")}
                    className={`rounded-sm border p-2 text-center font-semibold transition-all ${
                      actionType === "RESOLVE"
                        ? "border-signal bg-signal/20 text-signal"
                        : "border-border bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    Resolve Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType("FALSE_POSITIVE")}
                    className={`rounded-sm border p-2 text-center font-semibold transition-all ${
                      actionType === "FALSE_POSITIVE"
                        ? "border-destructive bg-destructive/20 text-destructive"
                        : "border-border bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    False Positive
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType("SUPPRESS")}
                    className={`rounded-sm border p-2 text-center font-semibold transition-all ${
                      actionType === "SUPPRESS"
                        ? "border-border bg-secondary text-foreground"
                        : "border-border bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    Suppress Noise
                  </button>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Authorizing Officer</label>
                <select
                  value={officerActor}
                  onChange={(e) => setOfficerActor(e.target.value)}
                  className="w-full h-9 rounded-sm border border-border bg-secondary/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="OFFICER_PATIL">Officer Patil (Field Investigator)</option>
                  <option value="OFFICER_SHINDE">Officer Shinde (Range Officer Core)</option>
                  <option value="FIELD_DIRECTOR_PENCH">Field Director Pench (Chief Conservator)</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">
                  Mandatory Forensic Rationale & Action Note *
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="State patrol outcome, field verification details, or suppression justification..."
                  rows={3}
                  className="w-full rounded-sm border border-border bg-secondary/80 p-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setActionAlert(null)}
                  className="rounded-sm border border-border bg-secondary/40 px-3 py-1.5 font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionSubmitting}
                  onClick={handleExecuteAction}
                  className="rounded-sm border border-primary bg-primary px-4 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionSubmitting ? "Recording Audit..." : "Submit Decision"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explainable Mathematical Evidence Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-sm border border-border bg-[oklch(0.16_0.012_150)] shadow-2xl">
            {/* Modal Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4.5 text-destructive" />
                <h2 className="font-mono text-sm font-bold text-foreground">
                  Explainable Mathematical Evidence: {selectedAlert.alert_id}
                </h2>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="grid size-7 place-items-center rounded-sm border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              <div className="panel rounded-sm p-4 border-border">
                <span className="data-chip text-[10px] text-muted-foreground">Alert Type & Severity</span>
                <p className="mt-1 font-display text-sm font-bold text-foreground">
                  {selectedAlert.title}
                </p>
                <p className="mt-1 text-muted-foreground leading-relaxed">
                  {selectedAlert.explanation}
                </p>
              </div>

              {/* Specific Mathematical Payload */}
              <div>
                <h3 className="font-display text-xs font-semibold text-foreground mb-3">
                  Deterministic Trigger Calculations
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedAlert.evidence_data?.distance_km !== undefined && (
                    <div className="rounded-sm border border-border bg-secondary/40 p-3">
                      <span className="text-muted-foreground">Observed Distance:</span>
                      <p className="font-mono text-lg font-bold text-destructive mt-0.5">
                        {selectedAlert.evidence_data.distance_km} km
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Threshold: {selectedAlert.evidence_data.threshold_km || 2.5} km
                      </p>
                    </div>
                  )}

                  {selectedAlert.evidence_data?.similarity !== undefined && (
                    <div className="rounded-sm border border-border bg-secondary/40 p-3">
                      <span className="text-muted-foreground">Re-ID Cosine Similarity:</span>
                      <p className="font-mono text-lg font-bold text-primary mt-0.5">
                        {(selectedAlert.evidence_data.similarity * 100).toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Decision: Confident individual match
                      </p>
                    </div>
                  )}

                  {selectedAlert.evidence_data?.days_since_last_seen !== undefined && (
                    <div className="rounded-sm border border-border bg-secondary/40 p-3">
                      <span className="text-muted-foreground">Days Since Last Sighting:</span>
                      <p className="font-mono text-lg font-bold text-destructive mt-0.5">
                        {selectedAlert.evidence_data.days_since_last_seen.toFixed(1)} days
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Median Interval: {selectedAlert.evidence_data.median_interval_days?.toFixed(1) || 7.0} days (3.0x multiplier)
                      </p>
                    </div>
                  )}

                  {selectedAlert.evidence_data?.survey_effort_adequate !== undefined && (
                    <div className="rounded-sm border border-border bg-secondary/40 p-3">
                      <span className="text-muted-foreground">Survey Effort Verification:</span>
                      <p className="font-mono text-xs font-bold text-signal mt-0.5">
                        ADEQUATE ({selectedAlert.evidence_data.active_stations_in_range} active stations in range)
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Absence anomaly is NOT a false alarm from station outage
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Raw JSON Payload */}
              <div>
                <span className="data-chip text-[10px] text-muted-foreground">
                  Forensic Raw Evidence JSON
                </span>
                <pre className="mt-1.5 overflow-x-auto rounded-sm border border-border bg-black/60 p-3 font-mono text-[11px] text-primary">
                  {JSON.stringify(selectedAlert.evidence_data || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
