import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { intelligenceService } from "@/lib/services";
import type { OverviewMetrics } from "@/lib/types/intelligence";
import { useAuth } from "@/lib/auth/context";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "TIGERTRACK AI — Operational Wildlife Intelligence Dashboard" },
      {
        name: "description",
        content:
          "Real-time operational dashboard for Pench Tiger Reserve: tiger identification, movement tracking, alert engine, camera stations, and triage review.",
      },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { isAuthenticated, isLoading, workstationConfigured } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isLoading) return;
    if (workstationConfigured === false) {
      navigate({ to: "/setup" });
      return;
    }
    if (!isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, workstationConfigured, navigate]);

  const fetchOverview = async () => {
    setIsRefreshing(true);
    try {
      const data = await intelligenceService.getOverview();
      if (data?.kpis) {
        setMetrics(data.kpis);
      }
    } catch (err) {
      console.warn("API offline or starting up, using cached local states:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 15000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground animate-pulse">Checking session…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[oklch(0.16_0.012_150)] text-foreground">
      {/* Persistent Sidebar */}
      <Sidebar
        reviewCount={metrics?.images_awaiting_review || 0}
        alertCount={metrics?.active_alerts_count || 0}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Header onRefresh={fetchOverview} isRefreshing={isRefreshing} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
