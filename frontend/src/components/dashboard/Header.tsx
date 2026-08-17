import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Shield,
  Clock,
  Compass,
  HardDriveDownload,
  RefreshCw,
  UserCheck,
  ChevronDown,
} from "lucide-react";

export function Header({
  onRefresh,
  isRefreshing = false,
}: {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const [time, setTime] = useState("");
  const [role, setRole] = useState("Range Forest Officer (RFO)");
  const [roleOpen, setRoleOpen] = useState(false);

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

  const roles = [
    { label: "Range Forest Officer (RFO)", actor: "OFFICER_PATIL" },
    { label: "Chief Wildlife Warden", actor: "CHIEF_WARDEN" },
    { label: "Field Wildlife Guard", actor: "BEAT_GUARD_04" },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-[oklch(0.16_0.012_150)]/90 px-6 backdrop-blur-md">
      {/* Left: Sector & Station Telemetry */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Compass className="size-4 text-primary" />
          <span className="font-semibold text-foreground">Sector:</span>
          <span className="data-chip rounded-sm bg-secondary px-2 py-0.5 text-foreground">
            Pench Karmajhiri & Touria Core
          </span>
        </div>
        <div className="hidden items-center gap-2 border-l border-border pl-4 text-xs sm:flex">
          <span className="text-muted-foreground">Grid Datum:</span>
          <span className="font-mono text-foreground">WGS84 · EPSG:4326</span>
        </div>
      </div>

      {/* Right: Actions, Clock & Officer Profile */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <div className="hidden items-center gap-1.5 rounded-sm border border-border bg-secondary/40 px-2.5 py-1 font-mono text-xs text-muted-foreground md:flex">
          <Clock className="size-3.5 text-primary" />
          <span>{time || "--:--:-- IST"}</span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="grid size-8 place-items-center rounded-sm border border-border text-muted-foreground transition-all hover:bg-secondary hover:text-foreground disabled:opacity-50"
            title="Refresh live data from tiger.db"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>
        )}

        {/* Quick Ingest Button */}
        <Link
          to="/dashboard/ingest"
          className="hidden items-center gap-1.5 rounded-sm border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20 sm:inline-flex"
        >
          <HardDriveDownload className="size-3.5" />
          <span>Ingest SD Card</span>
        </Link>

        {/* Officer Profile & Role Selector */}
        <div className="relative">
          <button
            onClick={() => setRoleOpen(!roleOpen)}
            className="flex items-center gap-2 rounded-sm border border-border bg-secondary/60 px-2.5 py-1 text-xs text-foreground transition-all hover:bg-secondary"
          >
            <div className="grid size-6 place-items-center rounded-sm bg-primary/20 text-primary">
              <UserCheck className="size-3.5" />
            </div>
            <div className="text-left">
              <span className="block font-semibold">RFO S. Patil</span>
              <span className="block text-[10px] text-muted-foreground">{role}</span>
            </div>
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>

          {roleOpen && (
            <div className="absolute right-0 mt-1 w-60 rounded-sm border border-border bg-[oklch(0.18_0.014_155)] p-1 shadow-[var(--shadow-deep)] z-50">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                SWITCH ACTIVE ROLE
              </div>
              {roles.map((r) => (
                <button
                  key={r.actor}
                  onClick={() => {
                    setRole(r.label);
                    setRoleOpen(false);
                  }}
                  className={`w-full rounded-sm px-2.5 py-1.5 text-left text-xs transition-colors ${
                    role === r.label
                      ? "bg-primary/20 font-semibold text-primary"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <div className="font-medium">{r.label}</div>
                  <div className="text-[10px] text-muted-foreground">Actor ID: {r.actor}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
