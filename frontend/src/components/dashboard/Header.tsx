import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Clock,
  Compass,
  HardDriveDownload,
  RefreshCw,
  UserCheck,
  ChevronDown,
  ShieldCheck,
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
    { label: "Field Wildlife Guard", actor: "BEAT_GUARD_04" },
    { label: "Chief Wildlife Warden", actor: "CHIEF_WARDEN" },
  ];

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

        {/* Officer Profile & Role Selector */}
        <div className="relative">
          <button
            onClick={() => setRoleOpen(!roleOpen)}
            className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs text-foreground transition-all hover:bg-secondary"
          >
            <div className="grid size-5.5 place-items-center rounded bg-primary/20 text-primary">
              <UserCheck className="size-3.5" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="block font-medium leading-none">RFO S. Patil</span>
              <span className="block text-[10px] text-muted-foreground leading-none mt-0.5">{role}</span>
            </div>
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>

          {roleOpen && (
            <div className="absolute right-0 mt-1.5 w-56 rounded-md border border-border bg-[oklch(0.16_0.014_155)] p-1.5 shadow-[var(--shadow-deep)] z-50">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active Officer Role
              </div>
              {roles.map((r) => (
                <button
                  key={r.actor}
                  onClick={() => {
                    setRole(r.label);
                    setRoleOpen(false);
                  }}
                  className={`w-full rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
                    role === r.label
                      ? "bg-primary/20 font-semibold text-primary"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <div className="font-medium">{r.label}</div>
                  <div className="text-[10px] text-muted-foreground">Officer: {r.actor}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
