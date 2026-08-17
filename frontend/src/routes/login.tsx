/**
 * TIGERTRACK AI — Login Page
 * Offline workstation authentication screen.
 * No cloud. No email. Officer ID + Password → Session Token.
 */
import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Shield, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { authApi } from "@/lib/auth/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated, workstationConfigured } = useAuth();
  const navigate = useNavigate();
  const [officerId, setOfficerId] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [workstationId, setWorkstationId] = useState<string | null>(null);
  const [officerCount, setOfficerCount] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated) { navigate({ to: "/dashboard" }); return; }
    authApi.status().then((s) => {
      setWorkstationId(s.workstation_id);
      setOfficerCount(s.officer_count);
      if (!s.configured) navigate({ to: "/setup" });
    }).catch(() => {});
  }, [isAuthenticated, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!officerId.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await login(officerId.trim(), password);
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[oklch(0.11_0.014_155)] relative overflow-hidden">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.07]" />
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 size-[40rem] rounded-full bg-primary/8 blur-[120px]" />

      <div className="relative w-full max-w-sm px-6 py-12">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 shadow-lg">
            <Shield className="size-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">TIGERTRACK AI</h1>
          <p className="mt-1 text-xs tracking-widest text-muted-foreground uppercase">
            Pench Tiger Reserve
          </p>
        </div>

        {/* No officers banner */}
        {officerCount === 0 && (
          <div className="mb-6 rounded-md border border-alert/30 bg-alert/10 px-4 py-3 text-xs text-alert">
            No officers registered. An administrator must set up this workstation first.
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="officer-id" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Officer ID
            </label>
            <input
              id="officer-id"
              type="text"
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              className="w-full rounded-md border border-border/60 bg-secondary/30 px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
              placeholder="e.g. RFO-PATIL"
              autoComplete="username"
              autoFocus
              disabled={loading || officerCount === 0}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-secondary/30 px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading || officerCount === 0}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading || !officerId.trim() || !password || officerCount === 0}
            className="mt-2 w-full rounded-md btn-amber py-2.5 text-sm font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign In to TIGERTRACK"}
          </button>
        </form>

        {/* Workstation footer */}
        <div className="mt-10 flex items-center justify-between text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <WifiOff className="size-3" />
            Offline
          </span>
          {workstationId && (
            <span>Workstation: {workstationId}</span>
          )}
        </div>
      </div>
    </div>
  );
}
