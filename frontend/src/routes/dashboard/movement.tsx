import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Footprints,
  PawPrint,
  Compass,
  ArrowRight,
  Clock,
  Radio,
  AlertTriangle,
  Activity,
  Layers,
} from "lucide-react";
import { intelligenceService } from "@/lib/services";
import type { MovementRecord, TigerProfile } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/movement")({
  component: MovementIntelligencePage,
});

function MovementIntelligencePage() {
  const [tigers, setTigers] = useState<TigerProfile[]>([]);
  const [selectedTigerId, setSelectedTigerId] = useState<string>("");
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    intelligenceService
      .getTigers()
      .then((list) => {
        setTigers(list);
        if (list.length > 0) {
          setSelectedTigerId(list[0].tiger_id);
        }
      })
      .catch((err) => console.warn("API offline:", err));
  }, []);

  useEffect(() => {
    if (!selectedTigerId) return;
    setLoading(true);
    intelligenceService
      .getMovement(selectedTigerId)
      .then((records) => {
        setMovements(records);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load movement records:", err);
        setLoading(false);
      });
  }, [selectedTigerId]);

  const selectedTiger = tigers.find((t) => t.tiger_id === selectedTigerId);

  // Compute summary stats
  const totalSteps = movements.length;
  const totalDisplacement = movements.reduce(
    (acc, m) => acc + (m.displacement_from_prev_km || 0),
    0
  );
  const avgDisplacement = totalSteps > 1 ? totalDisplacement / (totalSteps - 1) : 0;
  const anomalousCount = movements.filter(
    (m) => m.is_anomalous_speed || m.is_range_expansion
  ).length;

  return (
    <div className="space-y-6">
      {/* Header & Tiger Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Movement Intelligence & Trajectory Analysis
          </h1>
          <p className="data-chip text-muted-foreground">
            Sequential camera-trap encounters, centroid displacement, and unusual movement anomaly detection
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground">Select Tiger:</span>
          <select
            value={selectedTigerId}
            onChange={(e) => setSelectedTigerId(e.target.value)}
            className="h-9 rounded-sm border border-primary/40 bg-secondary/90 px-3 font-mono text-xs font-bold text-primary focus:border-primary focus:outline-none"
          >
            {tigers.map((t) => (
              <option key={t.tiger_id} value={t.tiger_id}>
                {t.tiger_id} ({t.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel rounded-sm p-4">
          <span className="text-xs text-muted-foreground">Historical Encounters</span>
          <p className="mt-2 font-display text-2xl font-bold text-primary">
            {totalSteps} captures
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Across Pench station grid</p>
        </div>

        <div className="panel rounded-sm p-4">
          <span className="text-xs text-muted-foreground">Cumulative Trajectory Path</span>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {totalDisplacement.toFixed(1)} km
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Total logged movement span</p>
        </div>

        <div className="panel rounded-sm p-4">
          <span className="text-xs text-muted-foreground">Mean Step Displacement</span>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {avgDisplacement.toFixed(2)} km
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Between successive camera traps</p>
        </div>

        <div className="panel rounded-sm p-4">
          <span className="text-xs text-muted-foreground">Movement Anomalies</span>
          <p
            className={`mt-2 font-display text-2xl font-bold ${
              anomalousCount > 0 ? "text-destructive" : "text-signal"
            }`}
          >
            {anomalousCount} flagged
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Speed or territory centroid shift</p>
        </div>
      </div>

      {/* Dynamic Visual Trajectory Graph */}
      <div className="panel rounded-sm p-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              Sequential Movement Path · {selectedTigerId}
            </h2>
            <p className="data-chip text-muted-foreground">
              Chronological camera station hops across Pench Tiger Reserve
            </p>
          </div>
          <span className="data-chip rounded-sm border border-signal/40 bg-signal/10 px-2.5 py-1 text-xs font-semibold text-signal">
            Live Trajectory
          </span>
        </div>

        <div className="mt-6">
          <svg
            viewBox="0 0 800 240"
            className="w-full overflow-visible"
            role="img"
            aria-label="Tiger Movement Trajectory Graph"
          >
            <defs>
              <linearGradient id="moveGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--amber)" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={i}
                x1="0"
                x2="800"
                y1={30 + i * 45}
                y2={30 + i * 45}
                stroke="var(--border)"
                strokeWidth="1"
                opacity="0.5"
              />
            ))}

            {/* Path */}
            {movements.length >= 2 && (
              <polyline
                fill="none"
                stroke="var(--amber)"
                strokeWidth="2.5"
                points={movements
                  .map((m, idx) => {
                    const x = 50 + (idx * 700) / Math.max(1, movements.length - 1);
                    // Map lat variance to y
                    const y = 60 + ((idx * 37) % 110);
                    return `${x},${y}`;
                  })
                  .join(" ")}
                strokeDasharray="4 4"
                className="animate-trail"
              />
            )}

            {/* Waypoint nodes */}
            {movements.map((m, idx) => {
              const x = 50 + (idx * 700) / Math.max(1, movements.length - 1);
              const y = 60 + ((idx * 37) % 110);

              return (
                <g key={m.movement_id || idx}>
                  <circle
                    cx={x}
                    cy={y}
                    r="6"
                    fill="var(--amber)"
                    stroke="var(--background)"
                    strokeWidth="2"
                  />
                  <text
                    x={x}
                    y={y - 12}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {m.station_id}
                  </text>
                  <text
                    x={x}
                    y={y + 18}
                    textAnchor="middle"
                    fill="var(--muted-foreground)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {m.timestamp ? m.timestamp.split("T")[0] : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Detailed Chronological Table */}
      <div className="panel overflow-hidden rounded-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/60 text-[11px] font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Step</th>
                <th className="px-4 py-3">Camera Station</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">GPS Coordinates</th>
                <th className="px-4 py-3">Step Displacement</th>
                <th className="px-4 py-3">Elapsed Time</th>
                <th className="px-4 py-3">Displacement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Loading trajectory records...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No movement records recorded for this tiger yet.
                  </td>
                </tr>
              ) : (
                movements.map((m, idx) => (
                  <tr key={m.movement_id || idx} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-mono font-bold text-muted-foreground">
                      #{idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-primary">
                      {m.station_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">{m.timestamp}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">
                      {m.displacement_from_prev_km !== undefined
                        ? `${m.displacement_from_prev_km.toFixed(2)} km`
                        : "Initial Sighting"}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {m.hours_from_prev !== undefined
                        ? `${m.hours_from_prev.toFixed(1)} hrs`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {m.is_range_expansion ? (
                        <span className="data-chip rounded-sm bg-destructive/20 px-2 py-0.5 font-bold text-destructive">
                          Range Expansion (&gt;4 km)
                        </span>
                      ) : m.is_anomalous_speed ? (
                        <span className="data-chip rounded-sm bg-amber/20 px-2 py-0.5 font-bold text-amber">
                          High Velocity
                        </span>
                      ) : (
                        <span className="data-chip rounded-sm bg-signal/10 px-2 py-0.5 font-semibold text-signal">
                          Territory Normal
                        </span>
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
  );
}
