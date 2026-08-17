/**
 * TIGERTRACK AI — First-Run Workstation Setup
 * Only shown when no officers exist (officer_count === 0).
 * Creates the initial ADMIN account and shows the recovery code.
 * If already configured → shows an "already set up" screen directing to /login.
 */
import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { CheckCircle2, Copy, Eye, EyeOff, KeyRound, Shield, LogIn, Users } from "lucide-react";
import { authApi } from "@/lib/auth/api";
import { useAuth } from "@/lib/auth/context";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

type Step = "checking" | "welcome" | "create" | "recovery" | "already_configured";

function SetupPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>("checking");

  // Form state
  const [officerId, setOfficerId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [workstationId, setWorkstationId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Check workstation status on mount
  useEffect(() => {
    if (isAuthenticated) { navigate({ to: "/dashboard" }); return; }
    authApi.status().then((s) => {
      if (s.configured && s.officer_count > 0) {
        setStep("already_configured");
      } else {
        setStep("welcome");
      }
    }).catch(() => setStep("welcome"));
  }, [isAuthenticated, navigate]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.setup(officerId.trim(), displayName.trim(), password);
      setRecoveryCode(res.recovery_code);
      setWorkstationId(res.workstation_id);
      setStep("recovery");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Setup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    try {
      await login(officerId.trim(), password);
      navigate({ to: "/dashboard" });
    } catch {
      navigate({ to: "/login" });
    }
  }

  function copyCode() {
    if (recoveryCode) {
      navigator.clipboard.writeText(recoveryCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[oklch(0.11_0.014_155)] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.07]" />
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 size-[40rem] rounded-full bg-primary/8 blur-[120px]" />

      <div className="relative w-full max-w-md px-6 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10">
            <Shield className="size-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Set Up TIGERTRACK</h1>
          <p className="mt-1 text-xs text-muted-foreground tracking-wide uppercase">
            Pench Tiger Reserve — First Run
          </p>
        </div>

        {/* Step indicator — only shown during actual setup flow */}
        {(step === "welcome" || step === "create" || step === "recovery") && (
          <div className="mb-8 flex justify-center gap-2">
            {(["welcome", "create", "recovery"] as Step[]).map((s) => (
              <div
                key={s}
                className={`size-2 rounded-full transition-all ${
                  step === s ? "bg-primary w-5" : "bg-border/60"
                }`}
              />
            ))}
          </div>
        )}

        {/* Checking spinner */}
        {step === "checking" && (
          <div className="flex flex-col items-center gap-4 py-8 text-muted-foreground">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            <span className="text-xs">Checking workstation…</span>
          </div>
        )}

        {/* Already configured — direct to login */}
        {step === "already_configured" && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-signal/40 bg-signal/10">
              <Users className="size-6 text-signal" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Workstation Already Configured</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This TIGERTRACK workstation already has officer accounts registered.
                New officers are added by an Administrator from inside the dashboard.
              </p>
            </div>
            <div className="rounded-md border border-border/50 bg-secondary/20 p-4 text-left text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground text-xs">To get an account:</p>
              <p>① Ask your Reserve Administrator to add you</p>
              <p>② They sign in → Dashboard → Officers → Add Officer</p>
              <p>③ You receive an Officer ID and set your password</p>
            </div>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-sm btn-amber py-3 text-sm font-semibold"
            >
              <LogIn className="size-4" />
              Sign In to TIGERTRACK
            </Link>
          </div>
        )}

        {/* Step: Welcome */}
        {step === "welcome" && (
          <div className="space-y-6 text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              This workstation has not been configured. You will create the first
              administrator account. Officers can be added afterward.
            </p>
            <div className="space-y-3 rounded-md border border-border/50 bg-secondary/20 p-4 text-left text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">What happens next:</p>
              <p>① Create the administrator account</p>
              <p>② Save the workstation recovery code</p>
              <p>③ Sign in to TIGERTRACK</p>
            </div>
            <button onClick={() => setStep("create")} className="w-full rounded-md btn-amber py-2.5 text-sm font-semibold">
              Begin Setup
            </button>
          </div>
        )}

        {/* Step: Create admin */}
        {step === "create" && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Officer ID</label>
              <input
                type="text"
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-secondary/30 px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                placeholder="e.g. ADMIN-001 or RFO-PATIL"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-secondary/30 px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                placeholder="Full name"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-border/60 bg-secondary/30 px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" tabIndex={-1}>
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-secondary/30 px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                placeholder="Re-enter password"
                required
              />
            </div>
            {error && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-md btn-amber py-2.5 text-sm font-semibold disabled:opacity-50">
              {loading ? "Creating…" : "Create Administrator Account"}
            </button>
          </form>
        )}

        {/* Step: Recovery code */}
        {step === "recovery" && recoveryCode && (
          <div className="space-y-6">
            <div className="rounded-md border border-alert/30 bg-alert/10 px-4 py-3 text-xs text-alert leading-relaxed">
              <strong>Save this recovery code now.</strong> It cannot be shown again. If the administrator password is lost, this code is required to regain access.
            </div>
            <div className="rounded-md border border-border/50 bg-secondary/20 p-4">
              {workstationId && (
                <p className="mb-2 text-[10px] text-muted-foreground uppercase tracking-wide">
                  Workstation: {workstationId}
                </p>
              )}
              <div className="flex items-center justify-between gap-3">
                <code className="flex-1 font-mono text-sm font-semibold tracking-widest text-primary break-all">
                  {recoveryCode}
                </code>
                <button onClick={copyCode} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" title="Copy code">
                  {copied ? <CheckCircle2 className="size-4 text-signal" /> : <Copy className="size-4" />}
                </button>
              </div>
            </div>
            <button onClick={handleFinish} className="w-full rounded-md btn-amber py-2.5 text-sm font-semibold">
              I have saved the recovery code → Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
