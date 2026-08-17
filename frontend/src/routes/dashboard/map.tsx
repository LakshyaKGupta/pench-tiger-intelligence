import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MapPin,
  Layers,
  Radio,
  PawPrint,
  Footprints,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  Compass,
  X,
} from "lucide-react";
import { intelligenceService } from "@/lib/services";
import type { GeoJSONFeatureCollection, CameraStation, TigerProfile } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/map")({
  component: WildlifeGISMapPage,
});

function WildlifeGISMapPage() {
  const [geoData, setGeoData] = useState<GeoJSONFeatureCollection | null>(null);
  const [stations, setStations] = useState<CameraStation[]>([]);
  const [tigers, setTigers] = useState<TigerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // 4 Primary Layer Controls
  const [showTigers, setShowTigers] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showTerritories, setShowTerritories] = useState(true);
  const [showMovement, setShowMovement] = useState(true);

  // Selection state
  const [selectedTiger, setSelectedTiger] = useState<TigerProfile | null>(null);
  const [selectedStation, setSelectedStation] = useState<CameraStation | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    Promise.all([
      intelligenceService.getMapGeoJSON(),
      intelligenceService.getStations(),
      intelligenceService.getTigers(),
    ])
      .then(([geo, stns, tgs]) => {
        setGeoData(geo);
        setStations(stns);
        setTigers(tgs);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load GIS data:", err);
        setLoading(false);
      });
  }, []);

  // Map coordinate bounds for Pench Tiger Reserve (Lat 21.65 to 21.85, Lon 79.15 to 79.45)
  const minLat = 21.65;
  const maxLat = 21.85;
  const minLon = 79.15;
  const maxLon = 79.45;

  const latLonToSvg = (lat: number, lon: number) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * 740 + 30;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 520 + 30;
    return { x, y };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & 4 Clean Layer Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Wildlife Map
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Pench Tiger Reserve Core, Buffer & Individual Home Range GIS
          </p>
        </div>

        {/* 4 Primary Layer Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTigers(!showTigers)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              showTigers
                ? "bg-primary/20 text-primary border border-primary/40"
                : "bg-secondary/40 text-muted-foreground border border-border/50 hover:text-foreground"
            }`}
          >
            <PawPrint className="size-3.5" /> Tigers
          </button>

          <button
            onClick={() => setShowStations(!showStations)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              showStations
                ? "bg-signal/20 text-signal border border-signal/40"
                : "bg-secondary/40 text-muted-foreground border border-border/50 hover:text-foreground"
            }`}
          >
            <Radio className="size-3.5" /> Camera Stations
          </button>

          <button
            onClick={() => setShowTerritories(!showTerritories)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              showTerritories
                ? "bg-amber/20 text-amber border border-amber/40"
                : "bg-secondary/40 text-muted-foreground border border-border/50 hover:text-foreground"
            }`}
          >
            <Layers className="size-3.5" /> Territories
          </button>

          <button
            onClick={() => setShowMovement(!showMovement)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              showMovement
                ? "bg-accent/20 text-accent border border-accent/40"
                : "bg-secondary/40 text-muted-foreground border border-border/50 hover:text-foreground"
            }`}
          >
            <Footprints className="size-3.5" /> Movement
          </button>
        </div>
      </div>

      {/* Main Interactive Map Canvas */}
      <div className="calm-card relative overflow-hidden rounded-lg p-4 bg-[oklch(0.12_0.015_155)]">
        {/* Floating Zoom Bar */}
        <div className="absolute top-6 right-6 z-20 flex flex-col gap-1.5 rounded-md border border-border/60 bg-[oklch(0.15_0.012_150)]/90 p-1.5 shadow-md backdrop-blur-md">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
            className="grid size-7 place-items-center rounded border border-border/60 text-foreground hover:bg-secondary transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
            className="grid size-7 place-items-center rounded border border-border/60 text-foreground hover:bg-secondary transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="size-3.5" />
          </button>
        </div>

        {/* Selected Tiger Contextual Info Card */}
        {selectedTiger && (
          <div className="absolute bottom-6 left-6 z-20 w-72 rounded-lg border border-primary/40 bg-[oklch(0.15_0.014_155)]/95 p-4 shadow-xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PawPrint className="size-4 text-primary" />
                <h3 className="font-display text-sm font-bold text-foreground">
                  {selectedTiger.tiger_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTiger(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Activity Status:</span>
                <span className="font-medium text-signal">{selectedTiger.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Territory Area:</span>
                <span className="font-medium text-foreground">
                  {selectedTiger.home_range_area_km2 > 0 ? `${selectedTiger.home_range_area_km2} km²` : "Core Range"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Sightings:</span>
                <span className="font-medium text-foreground">{selectedTiger.total_sightings} captures</span>
              </div>
            </div>

            <Link
              to="/dashboard/tigers"
              className="w-full flex items-center justify-center gap-1.5 rounded-md btn-amber py-1.5 text-xs font-semibold shadow-xs"
            >
              <span>View Tiger Profile</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>
        )}

        {/* SVG Vector Map Container */}
        <div className="flex justify-center items-center py-4 overflow-auto">
          <svg
            viewBox="0 0 800 580"
            className="w-full max-w-4xl h-auto transition-transform duration-300 select-none"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="800" height="580" fill="url(#grid)" />

            {/* Pench Reserve Core Boundary */}
            <path
              d="M 120,80 L 320,60 L 520,70 L 680,140 L 720,320 L 640,460 L 460,520 L 220,500 L 100,380 Z"
              fill="rgba(30, 80, 50, 0.15)"
              stroke="rgba(80, 160, 90, 0.4)"
              strokeWidth="2"
              strokeDasharray="6 4"
            />

            {/* Village Buffer Zone */}
            <path
              d="M 640,460 L 740,480 L 760,540 L 680,560 L 580,520 Z"
              fill="rgba(200, 70, 70, 0.08)"
              stroke="rgba(200, 70, 70, 0.35)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Tiger Territory Polygons (MCP) */}
            {showTerritories && (
              <g>
                <polygon
                  points="220,180 340,150 420,240 360,340 240,300"
                  fill="rgba(230, 170, 50, 0.12)"
                  stroke="rgba(230, 170, 50, 0.6)"
                  strokeWidth="1.5"
                />
                <polygon
                  points="440,220 580,200 620,320 540,400 420,340"
                  fill="rgba(80, 180, 120, 0.12)"
                  stroke="rgba(80, 180, 120, 0.6)"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Movement Trajectory Lines */}
            {showMovement && (
              <g>
                <polyline
                  points="240,300 300,240 360,200 420,240"
                  fill="none"
                  stroke="rgba(230, 170, 50, 0.7)"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
              </g>
            )}

            {/* Camera Stations */}
            {showStations &&
              stations.map((stn, idx) => {
                const { x, y } = latLonToSvg(stn.latitude, stn.longitude);
                return (
                  <g
                    key={stn.station_id || idx}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedStation(stn)}
                  >
                    <circle r="6" fill="rgba(80, 160, 90, 0.2)" stroke="rgba(80, 160, 90, 0.8)" strokeWidth="1.5" />
                    <circle r="2.5" fill="#4ade80" />
                    <text
                      y="-10"
                      textAnchor="middle"
                      fill="#a1a1aa"
                      fontSize="9"
                      fontFamily="monospace"
                      className="opacity-75 group-hover:opacity-100"
                    >
                      {stn.station_id}
                    </text>
                  </g>
                );
              })}

            {/* Tiger Sightings / Centroid Markers */}
            {showTigers &&
              tigers.map((t, idx) => {
                const lat = t.current_centroid_lat || 21.75 + (idx * 0.02 - 0.03);
                const lon = t.current_centroid_lon || 79.30 + (idx * 0.03 - 0.04);
                const { x, y } = latLonToSvg(lat, lon);

                return (
                  <g
                    key={t.tiger_id}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedTiger(t)}
                  >
                    <circle r="12" fill="rgba(230, 170, 50, 0.2)" stroke="#eab308" strokeWidth="1.5" />
                    <circle r="4" fill="#eab308" />
                    <text
                      y="22"
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {t.tiger_id}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>
      </div>
    </div>
  );
}
