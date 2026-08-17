import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MapPin,
  Radio,
  PawPrint,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  X,
  Compass,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { intelligenceService } from "@/lib/services";
import { api } from "@/lib/api/client";
import type { GeoJSONFeatureCollection, CameraStation, TigerProfile } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/map")({
  component: WildlifeGISMapPage,
});

export function WildlifeGISMapPage() {
  const [stations, setStations] = useState<CameraStation[]>([]);
  const [tigers, setTigers] = useState<TigerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Simple Layer Toggles
  const [showTigers, setShowTigers] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showVillageRisk, setShowVillageRisk] = useState(true);

  // Selected Tiger Filter & Details
  const [selectedTigerId, setSelectedTigerId] = useState<string>("ALL");
  const [selectedTiger, setSelectedTiger] = useState<TigerProfile | null>(null);
  const [selectedStation, setSelectedStation] = useState<CameraStation | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    Promise.all([
      intelligenceService.getStations(),
      intelligenceService.getTigers(),
    ])
      .then(([stns, tgs]) => {
        setStations(stns);
        setTigers(tgs);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load GIS data:", err);
        setLoading(false);
      });
  }, []);

  // Handle selecting a tiger from dropdown or marker
  const handleSelectTiger = (tiger: TigerProfile | null) => {
    setSelectedTiger(tiger);
    setSelectedStation(null);
    if (tiger) {
      setSelectedTigerId(tiger.tiger_id);
    } else {
      setSelectedTigerId("ALL");
    }
  };

  const handleSelectStation = (station: CameraStation | null) => {
    setSelectedStation(station);
    setSelectedTiger(null);
  };

  // Filtered tigers based on selection
  const displayedTigers =
    selectedTigerId === "ALL"
      ? tigers
      : tigers.filter((t) => t.tiger_id === selectedTigerId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Simple Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Compass className="size-6 text-primary" />
            Reserve Map · Pench
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Live individual positions, camera trap coverage, and territory boundaries
          </p>
        </div>

        {/* Simple Layer & Tiger Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tiger Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedTigerId}
              onChange={(e) => {
                const tid = e.target.value;
                setSelectedTigerId(tid);
                if (tid === "ALL") {
                  setSelectedTiger(null);
                } else {
                  const match = tigers.find((t) => t.tiger_id === tid);
                  setSelectedTiger(match || null);
                }
                setSelectedStation(null);
              }}
              className="h-9 rounded-md border border-border/70 bg-secondary/50 px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none transition-colors"
            >
              <option value="ALL">All Tigers ({tigers.length})</option>
              {tigers.map((t) => (
                <option key={t.tiger_id} value={t.tiger_id}>
                  {t.tiger_id} {t.name ? `(${t.name})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* 3 Simple Layer Toggle Pills */}
          <button
            onClick={() => setShowTigers(!showTigers)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              showTigers
                ? "bg-primary/20 text-primary border border-primary/40 shadow-xs"
                : "bg-secondary/40 text-muted-foreground border border-border/50 hover:text-foreground"
            }`}
          >
            <PawPrint className="size-3.5" /> Tigers
          </button>

          <button
            onClick={() => setShowStations(!showStations)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              showStations
                ? "bg-signal/20 text-signal border border-signal/40 shadow-xs"
                : "bg-secondary/40 text-muted-foreground border border-border/50 hover:text-foreground"
            }`}
          >
            <Radio className="size-3.5" /> Camera Stations
          </button>

          <button
            onClick={() => setShowVillageRisk(!showVillageRisk)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              showVillageRisk
                ? "bg-destructive/20 text-destructive border border-destructive/40 shadow-xs"
                : "bg-secondary/40 text-muted-foreground border border-border/50 hover:text-foreground"
            }`}
          >
            <AlertTriangle className="size-3.5" /> Village Risk Zones
          </button>
        </div>
      </div>

      {/* Main Reserve Map Surface */}
      <div className="calm-card relative min-h-[calc(100vh-210px)] flex flex-col justify-center overflow-hidden rounded-lg border border-border/70 p-4 bg-[oklch(0.11_0.015_150)] shadow-lg">
        {/* Floating Zoom Controls */}
        <div className="absolute top-6 right-6 z-20 flex flex-col gap-1.5 rounded-md border border-border/60 bg-[oklch(0.15_0.012_150)]/90 p-1.5 shadow-md backdrop-blur-md">
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.2))}
            className="grid size-7 place-items-center rounded border border-border/60 text-foreground hover:bg-secondary transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
            className="grid size-7 place-items-center rounded border border-border/60 text-foreground hover:bg-secondary transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="size-3.5" />
          </button>
        </div>

        {/* Selected Tiger Context Card (Floating Top-Left) */}
        {selectedTiger && (
          <div className="absolute top-6 left-6 z-20 w-72 rounded-lg border border-primary/40 bg-[oklch(0.14_0.016_150)]/95 p-3.5 shadow-2xl backdrop-blur-md space-y-2.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="grid size-7 place-items-center rounded-full bg-primary/20 text-primary border border-primary/40">
                  <PawPrint className="size-3.5" />
                </div>
                <div>
                  <h3 className="font-display text-xs font-bold text-foreground">
                    {selectedTiger.tiger_id}
                  </h3>
                  <span className="text-[10px] text-muted-foreground">{selectedTiger.name || "Resident Tiger"}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTiger(null);
                  setSelectedTigerId("ALL");
                }}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex justify-between">
                <span>Residency:</span>
                <span className="font-semibold text-signal">{selectedTiger.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Range Area:</span>
                <span className="font-semibold text-foreground">
                  {selectedTiger.home_range_area_km2 > 0 ? `${selectedTiger.home_range_area_km2} km²` : "Core Range"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sightings:</span>
                <span className="font-semibold text-primary">{selectedTiger.total_sightings} field captures</span>
              </div>
            </div>

            <Link
              to="/dashboard/tigers"
              className="w-full flex items-center justify-center gap-1 rounded-md btn-amber py-1.5 text-xs font-semibold shadow-xs"
            >
              <span>View Tiger Details</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        )}

        {/* Selected Camera Station Context Card (Floating Top-Left) */}
        {selectedStation && (
          <div className="absolute top-6 left-6 z-20 w-72 rounded-lg border border-signal/40 bg-[oklch(0.14_0.016_150)]/95 p-3.5 shadow-2xl backdrop-blur-md space-y-2.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-signal" />
                <h3 className="font-display text-xs font-bold text-foreground">
                  Station {selectedStation.station_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStation(null)}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex justify-between">
                <span>Zone / Range:</span>
                <span className="font-semibold text-foreground">
                  {selectedStation.zone_type || "Core Forest"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Coordinates:</span>
                <span className="font-mono text-[10px] text-foreground">
                  {selectedStation.latitude?.toFixed(4)}° N, {selectedStation.longitude?.toFixed(4)}° E
                </span>
              </div>
              <div className="flex justify-between">
                <span>Operating Status:</span>
                <span className="font-semibold text-signal">Active Monitoring</span>
              </div>
            </div>
          </div>
        )}

        {/* SVG Geographic Map Canvas */}
        <div className="flex justify-center items-center py-4 overflow-auto">
          <svg
            viewBox="0 0 900 620"
            className="w-full max-w-5xl h-auto transition-transform duration-300 select-none"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
          >
            <defs>
              {/* Soft forest grid pattern */}
              <pattern id="forest-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>

              {/* River water gradient */}
              <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#0284c7" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.4" />
              </linearGradient>

              {/* Core Forest Gradient */}
              <radialGradient id="coreForestGrad" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="rgba(20, 70, 45, 0.45)" />
                <stop offset="70%" stopColor="rgba(12, 45, 30, 0.35)" />
                <stop offset="100%" stopColor="rgba(8, 30, 20, 0.15)" />
              </radialGradient>
            </defs>

            {/* 1. Background Grid */}
            <rect width="900" height="620" fill="url(#forest-grid)" />

            {/* 2. Pench Buffer Zone Boundary */}
            <path
              d="M 80,60 L 380,40 L 680,50 L 840,140 L 860,420 L 760,560 L 520,590 L 220,570 L 60,440 Z"
              fill="rgba(15, 45, 30, 0.2)"
              stroke="rgba(60, 140, 80, 0.35)"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
            <text x="120" y="85" fill="#4ade80" opacity="0.4" fontSize="11" fontWeight="bold" letterSpacing="0.1em">
              PENCH TIGER RESERVE — BUFFER ZONE
            </text>

            {/* 3. Pench Core National Park Boundary */}
            <path
              d="M 180,120 L 420,90 L 640,110 L 760,200 L 780,380 L 680,490 L 440,510 L 220,470 L 140,320 Z"
              fill="url(#coreForestGrad)"
              stroke="rgba(74, 222, 128, 0.6)"
              strokeWidth="2"
            />
            <text x="320" y="140" fill="#86efac" opacity="0.75" fontSize="13" fontWeight="bold" letterSpacing="0.12em">
              PENCH NATIONAL PARK (CORE HABITAT)
            </text>

            {/* 4. Totladoh Reservoir / Pench River Waterway */}
            <path
              d="M 460,40 Q 480,140 430,220 T 390,340 T 420,460 T 360,590"
              fill="none"
              stroke="url(#riverGradient)"
              strokeWidth="16"
              strokeLinecap="round"
            />
            <path
              d="M 460,40 Q 480,140 430,220 T 390,340 T 420,460 T 360,590"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3"
              strokeOpacity="0.8"
            />
            {/* Waterway Label */}
            <text x="445" y="225" fill="#7dd3fc" fontSize="10" fontWeight="bold" letterSpacing="0.08em" opacity="0.85">
              Pench River & Totladoh
            </text>

            {/* 5. Range Demarcations & Labels */}
            <g opacity="0.6" fontSize="11" fontWeight="600" fill="#a1a1aa">
              <text x="240" y="240">Karmajhiri Range</text>
              <text x="560" y="220">Turia Range</text>
              <text x="280" y="420">Gumtara Range</text>
              <text x="580" y="410">Jamtara Range</text>
            </g>

            {/* 6. Human Settlement & Village Risk Perimeter (Southeast) */}
            {showVillageRisk && (
              <g>
                <path
                  d="M 720,380 L 860,420 L 820,530 L 680,490 Z"
                  fill="rgba(239, 68, 68, 0.12)"
                  stroke="rgba(239, 68, 68, 0.6)"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                />
                <text x="735" y="460" fill="#f87171" fontSize="10" fontWeight="bold">
                  Village Fringe Risk (2.5 km)
                </text>
              </g>
            )}

            {/* 7. Tiger Territory Home Ranges (Clean subtle polygons) */}
            <polygon
              points="260,200 380,170 440,260 380,360 260,320"
              fill="rgba(234, 179, 8, 0.12)"
              stroke="rgba(234, 179, 8, 0.6)"
              strokeWidth="1.5"
            />
            <polygon
              points="480,240 640,210 680,340 580,430 460,360"
              fill="rgba(74, 222, 128, 0.12)"
              stroke="rgba(74, 222, 128, 0.6)"
              strokeWidth="1.5"
            />

            {/* 8. Selected Tiger Trajectory Path */}
            {selectedTiger && (
              <g>
                <polyline
                  points="280,320 340,260 400,220 460,260 580,320"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="2.5"
                  strokeDasharray="6 3"
                />
              </g>
            )}

            {/* 9. Camera Trap Stations (Green Pins) */}
            {showStations &&
              stations.map((stn, idx) => {
                // Approximate visual positioning across the 4 ranges
                const defaultX = 220 + (idx % 5) * 110 + ((idx * 17) % 50);
                const defaultY = 160 + Math.floor(idx / 5) * 90 + ((idx * 13) % 40);

                return (
                  <g
                    key={stn.station_id || idx}
                    transform={`translate(${defaultX}, ${defaultY})`}
                    className="cursor-pointer group"
                    onClick={() => handleSelectStation(stn)}
                  >
                    <circle
                      r="7"
                      fill="rgba(74, 222, 128, 0.2)"
                      stroke="#4ade80"
                      strokeWidth="1.5"
                      className="group-hover:scale-125 transition-transform"
                    />
                    <circle r="2.5" fill="#4ade80" />
                    <text
                      y="-11"
                      textAnchor="middle"
                      fill="#e4e4e7"
                      fontSize="9"
                      fontFamily="monospace"
                      className="opacity-70 group-hover:opacity-100 group-hover:font-bold"
                    >
                      {stn.station_id}
                    </text>
                  </g>
                );
              })}

            {/* 10. Tiger Sighting Markers (Golden Glowing Pins) */}
            {showTigers &&
              displayedTigers.map((t, idx) => {
                // Distinct positions across Pench ranges
                const tigerPositions: Record<string, { x: number; y: number }> = {
                  "T-PENCH-001": { x: 340, y: 260 },
                  "T-PENCH-002": { x: 540, y: 250 },
                  "T-PENCH-003": { x: 380, y: 360 },
                  "T-PENCH-004": { x: 620, y: 320 },
                  "T-PENCH-007": { x: 740, y: 430 }, // Near village buffer
                  "T-PENCH-010": { x: 300, y: 440 },
                };

                const pos =
                  tigerPositions[t.tiger_id] || {
                    x: 280 + ((idx * 85) % 400),
                    y: 200 + ((idx * 65) % 250),
                  };

                const isSelected = selectedTiger?.tiger_id === t.tiger_id;

                return (
                  <g
                    key={t.tiger_id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer group"
                    onClick={() => handleSelectTiger(t)}
                  >
                    {/* Glowing pulse ring */}
                    <circle
                      r={isSelected ? "18" : "14"}
                      fill="rgba(234, 179, 8, 0.25)"
                      stroke="#eab308"
                      strokeWidth={isSelected ? "2.5" : "1.5"}
                      className="transition-all duration-200 group-hover:scale-110"
                    />
                    <circle r="4.5" fill="#facc15" />
                    <text
                      y="26"
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      className="drop-shadow-md"
                    >
                      {t.tiger_id}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>

        {/* Map Legend Footer Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-3 mt-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="size-2.5 rounded-full bg-[#4ade80]" /> Core Reserve Forest
            </span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="size-2.5 rounded-full bg-[#facc15]" /> Tiger Sighting
            </span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="size-2.5 rounded-full bg-[#38bdf8]" /> Pench River / Reservoir
            </span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="size-2.5 rounded-full bg-[#f87171]" /> Village Risk Fringe (2.5 km)
            </span>
          </div>

          <span className="text-[11px] font-mono text-muted-foreground">
            Pench Tiger Reserve · Coordinates: 21.75° N, 79.30° E
          </span>
        </div>
      </div>
    </div>
  );
}
