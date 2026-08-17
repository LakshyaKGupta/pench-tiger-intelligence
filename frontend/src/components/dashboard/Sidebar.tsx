import { Link, useLocation } from "@tanstack/react-router";
import {
  Radar,
  LayoutDashboard,
  PawPrint,
  Camera,
  Radio,
  Footprints,
  MapPin,
  AlertTriangle,
  CheckSquare,
  Image as ImageIcon,
  BarChart3,
  HardDriveDownload,
  Cpu,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: number | string;
  badgeColor?: string;
}

export function Sidebar({
  reviewCount = 0,
  alertCount = 0,
}: {
  reviewCount?: number;
  alertCount?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems: NavItem[] = [
    { label: "Command Center", href: "/dashboard", icon: LayoutDashboard },
    { label: "Tiger Catalog", href: "/dashboard/tigers", icon: PawPrint },
    { label: "Detection Center", href: "/dashboard/detections", icon: Camera },
    {
      label: "Human Review",
      href: "/dashboard/review",
      icon: CheckSquare,
      badge: reviewCount > 0 ? reviewCount : undefined,
      badgeColor: "bg-amber/20 text-amber border-amber/40",
    },
    { label: "Camera Stations", href: "/dashboard/stations", icon: Radio },
    { label: "Movement Track", href: "/dashboard/movement", icon: Footprints },
    { label: "Wildlife GIS Map", href: "/dashboard/map", icon: MapPin },
    {
      label: "Alert Center",
      href: "/dashboard/alerts",
      icon: AlertTriangle,
      badge: alertCount > 0 ? alertCount : undefined,
      badgeColor: "bg-destructive/20 text-destructive border-destructive/40",
    },
    { label: "Image Review", href: "/dashboard/images", icon: ImageIcon },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { label: "Ingest Camera Data", href: "/dashboard/ingest", icon: HardDriveDownload },
    { label: "Pipeline Health", href: "/dashboard/pipeline", icon: Cpu },
    { label: "System Diagnostics", href: "/dashboard/system", icon: Activity },
    { label: "Forensic Audit", href: "/dashboard/audit", icon: FileText },
  ];

  return (
    <aside
      className={`sticky top-0 z-40 flex h-screen flex-col border-r border-border bg-[oklch(0.14_0.014_155)] transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header / Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        <Link to="/" className="flex items-center gap-3 overflow-hidden">
          <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-primary/40 bg-primary/10 text-primary">
            <Radar className="size-4.5" />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block truncate font-display text-sm font-semibold tracking-[0.12em] text-foreground">
                TIGERTRACK AI
              </span>
              <span className="data-chip block truncate text-xs text-muted-foreground">
                Pench Reserve · Offline
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="grid size-7 shrink-0 place-items-center rounded-sm border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? currentPath === "/dashboard"
                : currentPath.startsWith(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`group flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "border border-primary/40 bg-primary/15 text-primary shadow-[0_0_12px_rgba(230,170,50,0.1)]"
                    : "border border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  className={`size-4.5 shrink-0 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                {!collapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {!collapsed && item.badge !== undefined && (
                  <span
                    className={`data-chip shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${
                      item.badgeColor || "border-border bg-secondary text-foreground"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Offline Status & User Info */}
      <div className="border-t border-border p-3">
        {!collapsed ? (
          <div className="rounded-sm border border-signal/30 bg-signal/5 p-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-signal"></span>
              </span>
              <span className="data-chip font-semibold text-signal">OFFLINE WORKSTATION</span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              Local DB: tiger.db (Active)
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title="Offline Workstation Active">
            <ShieldCheck className="size-5 text-signal" />
          </div>
        )}
      </div>
    </aside>
  );
}
