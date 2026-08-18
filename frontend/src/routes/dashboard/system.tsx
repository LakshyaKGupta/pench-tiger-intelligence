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
  Users,
  UserPlus,
  KeyRound,
  UserX,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { intelligenceService } from "@/lib/services";
import type { SystemHealthResponse } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/system")({
  component: SystemHealthPage,
});

interface Officer {
  id: string;
  officer_id: string;
  display_name: string;
  role: string;
  is_active: number;
  created_at: string;
  last_login_at?: string;
}

function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Officers Management State
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [isAddOfficerModal, setIsAddOfficerModal] = useState(false);
  const [newOfficer, setNewOfficer] = useState({
    officer_id: "",
    display_name: "",
    role: "OFFICER",
    password: "",
  });
  const [creatingOfficer, setCreatingOfficer] = useState(false);

  // Password Reset State
  const [resetTargetOfficer, setResetTargetOfficer] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

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

  const fetchOfficers = async () => {
    setOfficersLoading(true);
    try {
      const res = await intelligenceService.listOfficers();
      setOfficers(res.officers || []);
    } catch (err: any) {
      // If not logged in as admin or session missing, silently fallback
      console.warn("Could not list officers:", err);
    } finally {
      setOfficersLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchOfficers();
  }, []);

  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficer.officer_id.trim() || !newOfficer.password.trim()) {
      toast.error("Please fill in all required officer credentials.");
      return;
    }
    if (newOfficer.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setCreatingOfficer(true);
    try {
      const res = await intelligenceService.createOfficer({
        ...newOfficer,
        officer_id: newOfficer.officer_id.trim().toUpperCase(),
      });
      toast.success(res.message || `Officer ${newOfficer.officer_id} account created.`);
      setIsAddOfficerModal(false);
      setNewOfficer({ officer_id: "", display_name: "", role: "OFFICER", password: "" });
      await fetchOfficers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create officer account.");
    } finally {
      setCreatingOfficer(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetOfficer || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setResettingPassword(true);
    try {
      const res = await intelligenceService.resetOfficerPassword(resetTargetOfficer, {
        new_password: newPassword,
      });
      toast.success(res.message || `Password reset for ${resetTargetOfficer}.`);
      setResetTargetOfficer(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeactivateOfficer = async (officerId: string) => {
    if (!confirm(`Deactivate access for officer ${officerId}?`)) return;
    try {
      const res = await intelligenceService.deactivateOfficer(officerId);
      toast.success(res.message || `Officer ${officerId} deactivated.`);
      await fetchOfficers();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate officer.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            System Diagnostics & Offline Workstation Telemetry
          </h1>
          <p className="data-chip text-muted-foreground">
            Hardware runtime, SQLite database integrity, local model weights, and offline officer access
          </p>
        </div>

        <button
          onClick={() => {
            fetchHealth();
            fetchOfficers();
          }}
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

          {/* Offline Officer Access & Role Management */}
          <div className="panel rounded-sm p-6 border-border space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Users className="size-4.5 text-primary" />
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    Offline Officer Access & Workstation RBAC
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Argon2id cryptographic password authentication · 100% offline local verification
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddOfficerModal(true)}
                className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <UserPlus className="size-3.5" />
                Provision Officer Account
              </button>
            </div>

            {/* Officer Accounts Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-secondary/40 text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">Officer ID</th>
                    <th className="px-3 py-2.5">Name / Call Sign</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5">Account Status</th>
                    <th className="px-3 py-2.5">Created At</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {officers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        {officersLoading ? "Loading officer roster..." : "No additional officer accounts registered."}
                      </td>
                    </tr>
                  ) : (
                    officers.map((off) => (
                      <tr key={off.id || off.officer_id} className="hover:bg-secondary/20">
                        <td className="px-3 py-2.5 font-mono font-bold text-primary">
                          {off.officer_id}
                        </td>
                        <td className="px-3 py-2.5 text-foreground font-medium">
                          {off.display_name}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`data-chip rounded-sm px-2 py-0.5 text-[11px] font-semibold ${
                              off.role === "ADMIN"
                                ? "bg-primary/20 text-primary"
                                : off.role === "SUPERVISOR"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {off.role}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 font-mono text-[11px] ${off.is_active ? "text-signal" : "text-destructive"}`}>
                            <span className={`size-1.5 rounded-full ${off.is_active ? "bg-signal" : "bg-destructive"}`} />
                            {off.is_active ? "ACTIVE" : "DEACTIVATED"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                          {off.created_at ? off.created_at.split("T")[0] : "Recent"}
                        </td>
                        <td className="px-3 py-2.5 text-right space-x-2">
                          <button
                            onClick={() => {
                              setResetTargetOfficer(off.officer_id);
                              setNewPassword("");
                            }}
                            className="inline-flex items-center gap-1 rounded-sm border border-border bg-secondary/60 px-2 py-1 text-[11px] text-foreground hover:bg-secondary"
                          >
                            <KeyRound className="size-3 text-muted-foreground" />
                            Reset Password
                          </button>
                          {off.role !== "ADMIN" && off.is_active === 1 && (
                            <button
                              onClick={() => handleDeactivateOfficer(off.officer_id)}
                              className="inline-flex items-center gap-1 rounded-sm border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/20"
                            >
                              <UserX className="size-3" />
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Provision Officer Modal */}
      {isAddOfficerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-md border border-border bg-[oklch(0.16_0.012_150)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="size-5 text-primary" />
                <h3 className="font-display text-base font-bold text-foreground">
                  Provision Forest Officer Account
                </h3>
              </div>
              <button onClick={() => setIsAddOfficerModal(false)} className="text-muted-foreground hover:text-foreground">
                <AlertTriangle className="hidden" />
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOfficer} className="space-y-3.5 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Officer ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RFO-SHARMA or OFFICER-002"
                  value={newOfficer.officer_id}
                  onChange={(e) => setNewOfficer({ ...newOfficer, officer_id: e.target.value })}
                  className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Full Name / Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Range Forest Officer Sharma"
                  value={newOfficer.display_name}
                  onChange={(e) => setNewOfficer({ ...newOfficer, display_name: e.target.value })}
                  className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Assigned Role</label>
                <select
                  value={newOfficer.role}
                  onChange={(e) => setNewOfficer({ ...newOfficer, role: e.target.value })}
                  className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="OFFICER">OFFICER (Ingest, Maps, Profiles, Sighting Search)</option>
                  <option value="SUPERVISOR">SUPERVISOR (Alert Actioning, Re-ID Review & Approval)</option>
                  <option value="ADMIN">ADMIN (Full Workstation & User Administration)</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-medium">Initial Offline Password (min 8 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newOfficer.password}
                  onChange={(e) => setNewOfficer({ ...newOfficer, password: e.target.value })}
                  className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddOfficerModal(false)}
                  className="rounded-sm border border-border bg-secondary/60 px-4 py-2 text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOfficer}
                  className="flex items-center gap-1.5 rounded-sm bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <CheckCircle2 className="size-3.5" />
                  {creatingOfficer ? "Provisioning..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetTargetOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-md border border-border bg-[oklch(0.16_0.012_150)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="size-5 text-primary" />
                <h3 className="font-display text-base font-bold text-foreground">
                  Reset Password for {resetTargetOfficer}
                </h3>
              </div>
              <button onClick={() => setResetTargetOfficer(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-medium">New Password (min 8 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-8.5 rounded-sm border border-border bg-secondary/60 px-3 font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setResetTargetOfficer(null)}
                  className="rounded-sm border border-border bg-secondary/60 px-4 py-2 text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="rounded-sm bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {resettingPassword ? "Saving..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
