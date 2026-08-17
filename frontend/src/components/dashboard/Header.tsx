import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Clock,
  Compass,
  HardDriveDownload,
  RefreshCw,
  UserCheck,
  ChevronDown,
  Lock,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";

export function Header({
  onRefresh,
  isRefreshing = false,
}: {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const { session, lock, logout } = useAuth();
  const [time, setTime] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }) + " IST"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [menuOpen]);

  const displayName = session?.display_name ?? "Officer";
  const roleLabel =
    session?.role === "ADMIN"
      ? "System Administrator"
      : session?.role === "SUPERVISOR"
      ? "Supervisor / Director"
      : "Range Forest Officer";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-[oklch(0.14_0.012_150)]/95 px-6 backdrop-blur-md">
      {/* Left: Pench Reserve Location */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Compass className="size-4 text-primary" />
          <span className="font-semibold text-foreground">Pench Tiger Reserve</span>
          <span className="text-muted-foreground hidden sm:inline">· Madhya Pradesh / Maharashtra</span>
        </div>
      </div>

      {/* Right: Actions, Clock & Officer Profile */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <div className="hidden items-center gap-1.5 rounded-md border border-border/50 bg-secondary/30 px-2.5 py-1 text-xs text-muted-foreground md:flex">
          <Clock className="size-3.5 text-primary" />
          <span className="font-mono">{time || "--:--:-- IST"}</span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="grid size-7 place-items-center rounded-md border border-border/60 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground disabled:opacity-50"
            title="Refresh live data"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>
        )}

        {/* Quick Ingest Button */}
        <Link
          to="/dashboard/ingest"
          className="hidden items-center gap-1.5 rounded-md btn-amber px-3 py-1.5 text-xs font-semibold shadow-xs sm:inline-flex"
        >
          <HardDriveDownload className="size-3.5" />
          <span>Ingest Data</span>
        </Link>

        {/* Officer Identity & Menu */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            id="officer-menu-trigger"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs text-foreground transition-all hover:bg-secondary"
          >
            <div className="grid size-5 place-items-center rounded bg-primary/20 text-primary">
              <UserCheck className="size-3.5" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="block font-medium leading-none">{displayName}</span>
              <span className="block text-[10px] text-muted-foreground leading-none mt-0.5">{roleLabel}</span>
            </div>
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1.5 w-56 rounded-md border border-border bg-[oklch(0.16_0.014_155)] p-1.5 shadow-[var(--shadow-deep)] z-50">
              {/* Officer info header */}
              <div className="px-2.5 py-2 border-b border-border/40 mb-1">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="size-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{displayName}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{session?.officer_id}</div>
                <div className="text-[10px] text-muted-foreground">{roleLabel}</div>
              </div>

              {/* Lock */}
              <button
                id="lock-session-btn"
                onClick={() => { lock(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors"
              >
                <Lock className="size-3.5 text-muted-foreground" />
                Lock Workstation
              </button>

              {/* Sign out */}
              <button
                id="sign-out-btn"
                onClick={async () => { await logout(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="size-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
