import { Link, useLocation } from "@tanstack/react-router";
import {
  Radar,
  LayoutDashboard,
  PawPrint,
  MapPin,
  AlertTriangle,
  HardDriveDownload,
  CheckSquare,
  Camera,
  Radio,
  Footprints,
  Image as ImageIcon,
  BarChart3,
  Cpu,
  Activity,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  SlidersHorizontal,
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

  // 5 Primary Operational Destinations
  const primaryNavItems: NavItem[] = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "Tigers", href: "/dashboard/tigers", icon: PawPrint },
    { label: "Map", href: "/dashboard/map", icon: MapPin },
    {
      label: "Alerts",
      href: "/dashboard/alerts",
      icon: AlertTriangle,
      badge: alertCount > 0 ? alertCount : undefined,
      badgeColor: "bg-destructive/20 text-destructive border-destructive/40",
    },
    { label: "Ingest", href: "/dashboard/ingest", icon: HardDriveDownload },
  ];

  // Advanced & Technical Capabilities
  const advancedNavItems: NavItem[] = [
    {
      label: "Human Review",
      href: "/dashboard/review",
      icon: CheckSquare,
      badge: reviewCount > 0 ? reviewCount : undefined,
      badgeColor: "bg-amber/20 text-amber border-amber/40",
    },
    { label: "Detection Center", href: "/dashboard/detections", icon: Camera },
    { label: "Image Review", href: "/dashboard/images", icon: ImageIcon },
    { label: "Camera Stations", href: "/dashboard/stations", icon: Radio },
    { label: "Movement Track", href: "/dashboard/movement", icon: Footprints },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { label: "Pipeline Health", href: "/dashboard/pipeline", icon: Cpu },
    { label: "System Diagnostics", href: "/dashboard/system", icon: Activity },
    { label: "Forensic Audit", href: "/dashboard/audit", icon: FileText },
  ];

  // Auto-expand Advanced if current path is inside an advanced route
  const isInsideAdvanced = advancedNavItems.some((item) =>
    currentPath.startsWith(item.href)
  );
  const [advancedOpen, setAdvancedOpen] = useState(isInsideAdvanced);

  return (
    <aside
      className={`sticky top-0 z-40 flex h-screen flex-col border-r border-border/70 bg-[oklch(0.13_0.014_155)] transition-all duration-250 select-none ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Header / Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-3.5">
        <Link to="/" className="flex items-center gap-3 overflow-hidden">
          <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary border border-primary/30">
            <Radar className="size-4.5" />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block truncate font-display text-sm font-bold tracking-[0.08em] text-foreground">
                TIGERTRACK AI
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                Pench Tiger Reserve
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="grid size-7 shrink-0 place-items-center rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
        {/* Primary Destinations */}
        <div>
          {!collapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Intelligence Core
            </div>
          )}
          <nav className="space-y-1">
            {primaryNavItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? currentPath === "/dashboard" || currentPath === "/dashboard/"
                  : currentPath.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "border border-primary/40 bg-primary/15 text-primary shadow-[0_0_12px_rgba(230,170,50,0.08)] font-semibold"
                      : "border border-transparent text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
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
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        item.badgeColor || "border border-border bg-secondary text-foreground"
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

        {/* Advanced Section */}
        <div className="border-t border-border/40 pt-3">
          {!collapsed ? (
            <div>
              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <SlidersHorizontal className="size-3" />
                  Advanced Tools
                </span>
                <ChevronDown
                  className={`size-3 transition-transform duration-200 ${
                    advancedOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {advancedOpen && (
                <nav className="mt-1 space-y-0.5 pl-1">
                  {advancedNavItems.map((item) => {
                    const isActive = currentPath.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs transition-all ${
                          isActive
                            ? "bg-secondary text-foreground font-semibold border-l-2 border-primary"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                        }`}
                      >
                        <item.icon className="size-3.5 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={`shrink-0 rounded px-1 py-0.2 text-[9px] font-bold ${
                              item.badgeColor || "bg-secondary text-foreground"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {advancedNavItems.slice(0, 3).map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  title={item.label}
                  className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <item.icon className="size-4" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Offline Status Footer */}
      <div className="border-t border-border/60 p-3 bg-secondary/20">
        {!collapsed ? (
          <div className="flex items-center justify-between rounded-sm border border-signal/20 bg-signal/5 px-2.5 py-2">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60"></span>
                <span className="relative inline-flex size-2 rounded-full bg-signal"></span>
              </span>
              <span className="text-[11px] font-semibold text-signal">Offline Ready</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Local DB</span>
          </div>
        ) : (
          <div className="flex justify-center" title="Offline System Active">
            <ShieldCheck className="size-4.5 text-signal" />
          </div>
        )}
      </div>
    </aside>
  );
}
