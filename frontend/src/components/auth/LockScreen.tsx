/**
 * TIGERTRACK AI — Lock Screen
 * Full-screen overlay rendered on top of current UI when session is locked.
 * Officer re-enters their password to unlock without losing application state.
 */
import { useState } from "react";
import { Eye, EyeOff, Lock, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

export function LockScreen() {
  const { session, unlock, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      await unlock(password);
      setPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Incorrect password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[oklch(0.10_0.014_155/0.97)] backdrop-blur-sm">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.07]" />

      <div className="relative w-full max-w-sm px-6">
        {/* Lock icon */}
        <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-2xl border border-border/60 bg-secondary/40 shadow-xl">
          <Lock className="size-7 text-primary" />
        </div>

        {/* Heading */}
        <div className="mb-8 text-center">
          <div className="mb-1 flex items-center justify-center gap-2">
            <Shield className="size-4 text-primary" />
            <span className="font-display text-sm font-semibold tracking-widest text-primary/80 uppercase">
              TIGERTRACK AI
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Workstation Locked
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {session?.display_name
              ? `Locked as ${session.display_name}`
              : "Enter your password to continue."}
          </p>
        </div>

        {/* Unlock form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          {session?.officer_id && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Officer ID
              </label>
              <div className="rounded-md border border-border/60 bg-secondary/30 px-3.5 py-2.5 text-sm text-foreground/70">
                {session.officer_id}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <input
                id="lock-password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-secondary/30 px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                placeholder="Enter your password"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
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
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-md btn-amber py-2.5 text-sm font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Unlocking…" : "Unlock TIGERTRACK"}
          </button>
        </form>

        {/* Sign in as different officer */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="size-3.5" />
            Sign in as a different officer
          </button>
        </div>
      </div>
    </div>
  );
}
