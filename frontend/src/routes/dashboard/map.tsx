import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  MapPin,
  Layers,
  Eye,
  Compass,
  Radio,
  PawPrint,
  AlertTriangle,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
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

  // Layer Toggles
  const [showStations, setShowStations] = useState(true);
  const [showTerritories, setShowTerritories] = useState(true);
  const [showCentroids, setShowCentroids] = useState(true);
  const [showVillageBuffers, setShowVillageBuffers] = useState(true);
  const [showCoreBoundary, setShowCoreBoundary] = useState(true);

  // Selection state
  const [selectedFeature, setSelectedFeature] = useState<any | null>(null);
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

  // Map coordinate bounds for Pench Tiger Reserve (approx: Lat 21.65 to 21.85, Lon 79.15 to 79.45)
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
    <div className="space-y-6">
      {/* Header & Layer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Wildlife GIS Spatial Intelligence Map
          </h1>
          <p className="data-chip text-muted-foreground">
            100% Offline Vector GIS · Pench Tiger Reserve Core, Buffer & MCP Home Ranges
          </p>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowStations(!showStations)}
            className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-all ${
              showStations
                ? "border-primary/50 bg-primary/20 text-primary"
                : "border-border bg-secondary/60 text-muted-foreground"
            }`}
          >
            <Radio className="size-3.5" /> Stations
          </button>

          <button
            onClick={() => setShowTerritories(!showTerritories)}
            className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-all ${
              showTerritories
                ? "border-signal/50 bg-signal/20 text-signal"
                : "border-border bg-secondary/60 text-muted-foreground"
            }`}
          >
            <Layers className="size-3.5" /> 100% MCP Ranges
          </button>

          <button
            onClick={() => setShowCentroids(!showCentroids)}
            className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-all ${
              showCentroids
                ? "border-amber/50 bg-amber/20 text-amber"
                : "border-border bg-secondary/60 text-muted-foreground"
            }`}
          >
            <PawPrint className="size-3.5" /> Centroids
          </button>

          <button
            onClick={() => setShowVillageBuffers(!showVillageBuffers)}
            className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-all ${
              showVillageBuffers
                ? "border-destructive/50 bg-destructive/20 text-destructive"
                : "border-border bg-secondary/60 text-muted-foreground"
            }`}
          >
            <AlertTriangle className="size-3.5" /> Village Risk (2.5 km)
          </button>
        </div>
      </div>

      {/* Main Interactive Map Canvas */}
      <div className="panel relative overflow-hidden rounded-sm border border-border p-4 bg-[oklch(0.13_0.014_155)]">
        {/* Floating Zoom & Legend Bar */}
        <div className="absolute top-6 right-6 z-20 flex flex-col gap-2 rounded-sm border border-border bg-[oklch(0.16_0.012_150)]/90 p-2 shadow-lg backdrop-blur-md">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
            className="grid size-7 place-items-center rounded-sm border border-border text-foreground hover:bg-secondary"
            title="Zoom In"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
            className="grid size-7 place-items-center rounded-sm border border-border text-foreground hover:bg-secondary"
            title="Zoom Out"
          >
            <ZoomOut className="size-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="grid size-7 place-items-center rounded-sm border border-border text-xs font-mono font-bold text-primary hover:bg-secondary"
            title="Reset Zoom"
          >
            1x
          </button>
        </div>

        {/* Floating Compass & Scale */}
        <div className="absolute bottom-6 left-6 z-20 flex items-center gap-4 rounded-sm border border-border bg-[oklch(0.16_0.012_150)]/90 px-3 py-2 text-xs backdrop-blur-md font-mono">
          <div className="flex items-center gap-1.5 text-primary">
            <Compass className="size-4" />
            <span className="font-bold">N · Pench Core Grid</span>
          </div>
          <div className="border-l border-border pl-3 text-muted-foreground">
            Scale: 1:50,000 · Datum WGS84
          </div>
        </div>

        {/* SVG GIS Canvas */}
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <svg
            viewBox="0 0 800 580"
            className="size-full transition-transform duration-300 ease-out"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
          >
            <defs>
              {/* Pattern for Reserve Grid */}
              <pattern id="gisGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
              </pattern>

              {/* Territory glow */}
              <filter id="mcpGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Grid */}
            <rect width="800" height="580" fill="url(#gisGrid)" />

            {/* Simulated Pench Reserve Core Boundary */}
            {showCoreBoundary && (
              <polygon
                points="100,80 340,60 620,110 720,280 660,460 400,520 180,480 80,320"
                fill="oklch(0.25 0.035 158)"
                fillOpacity="0.35"
                stroke="var(--olive)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
            )}

            {/* Village Risk Buffers */}
            {showVillageBuffers &&
              stations
                .filter((s) => (s.distance_to_village_km || 5) <= 2.5)
                .map((s) => {
                  const { x, y } = latLonToSvg(s.latitude, s.longitude);
                  return (
                    <g key={`buf-${s.station_id}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="42"
                        fill="oklch(0.68 0.17 45)"
                        fillOpacity="0.12"
                        stroke="oklch(0.68 0.17 45)"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                    </g>
                  );
                })}

            {/* Tiger Minimum Convex Polygon Territories (from GeoJSON or calculated) */}
            {showTerritories &&
              geoData?.features
                ?.filter((f) => f.properties?.layer === "mcp_territories" || f.geometry?.type === "Polygon")
                .map((f, idx) => {
                  const coords = f.geometry.coordinates[0];
                  if (!coords || coords.length < 3) return null;
                  const pts = coords
                    .map((pt: [number, number]) => {
                      const { x, y } = latLonToSvg(pt[1], pt[0]);
                      return `${x},${y}`;
                    })
                    .join(" ");

                  return (
                    <polygon
                      key={idx}
                      points={pts}
                      fill="oklch(0.78 0.13 78)"
                      fillOpacity="0.18"
                      stroke="var(--amber)"
                      strokeWidth="2"
                      className="cursor-pointer transition-all hover:fill-opacity-35"
                      onClick={() =>
                        setSelectedFeature({
                          type: "Territory",
                          tigerId: f.properties?.tiger_id,
                          area: f.properties?.area_km2,
                        })
                      }
                    />
                  );
                })}

            {/* Camera Stations */}
            {showStations &&
              stations.map((s) => {
                const { x, y } = latLonToSvg(s.latitude, s.longitude);
                const isSelected = selectedFeature?.station_id === s.station_id;

                return (
                  <g
                    key={s.station_id}
                    className="cursor-pointer"
                    onClick={() => setSelectedFeature({ type: "Station", ...s })}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? "9" : "6"}
                      fill={s.zone === "Buffer" ? "var(--amber)" : "var(--signal)"}
                      stroke="var(--background)"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={y - 10}
                      textAnchor="middle"
                      fill="var(--foreground)"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {s.station_id}
                    </text>
                  </g>
                );
              })}

            {/* Tiger Centroids */}
            {showCentroids &&
              tigers
                .filter((t) => t.current_centroid_lat && t.current_centroid_lon)
                .map((t) => {
                  const { x, y } = latLonToSvg(
                    t.current_centroid_lat!,
                    t.current_centroid_lon!
                  );

                  return (
                    <g
                      key={`cent-${t.tiger_id}`}
                      className="cursor-pointer"
                      onClick={() => setSelectedFeature({ type: "Tiger", ...t })}
                    >
                      <polygon
                        points={`${x},${y - 8} ${x + 7},${y + 6} ${x - 7},${y + 6}`}
                        fill="var(--primary)"
                        stroke="var(--background)"
                        strokeWidth="1.5"
                      />
                      <text
                        x={x}
                        y={y + 18}
                        textAnchor="middle"
                        fill="var(--primary)"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {t.tiger_id}
                      </text>
                    </g>
                  );
                })}
          </svg>
        </div>

        {/* Selected Feature Info Popup Panel */}
        {selectedFeature && (
          <div className="absolute bottom-6 right-6 z-30 max-w-sm rounded-sm border border-primary/50 bg-[oklch(0.16_0.012_150)] p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="data-chip font-bold text-primary">
                {selectedFeature.type.toUpperCase()} INSPECTOR
              </span>
              <button
                onClick={() => setSelectedFeature(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-1.5 text-xs">
              {selectedFeature.type === "Station" && (
                <>
                  <p className="font-mono font-bold text-foreground">
                    Station: {selectedFeature.station_id} ({selectedFeature.zone})
                  </p>
                  <p className="text-muted-foreground">
                    Coordinates: {selectedFeature.latitude?.toFixed(4)},{" "}
                    {selectedFeature.longitude?.toFixed(4)}
                  </p>
                  <p className="text-muted-foreground">
                    Distance to Village: {selectedFeature.distance_to_village_km?.toFixed(1) || 5.0} km
                  </p>
                  <p className="text-muted-foreground">
                    Total Detections: {selectedFeature.total_detections || 0}
                  </p>
                </>
              )}

              {selectedFeature.type === "Tiger" && (
                <>
                  <p className="font-mono font-bold text-primary">
                    Tiger: {selectedFeature.tiger_id} ({selectedFeature.name})
                  </p>
                  <p className="text-muted-foreground">
                    Status: {selectedFeature.status} · Sex: {selectedFeature.gender}
                  </p>
                  <p className="text-muted-foreground">
                    Home Range Area: {selectedFeature.home_range_area_km2} km²
                  </p>
                  <p className="text-muted-foreground">
                    Sightings Count: {selectedFeature.total_sightings}
                  </p>
                </>
              )}

              {selectedFeature.type === "Territory" && (
                <>
                  <p className="font-mono font-bold text-primary">
                    100% Minimum Convex Polygon (MCP)
                  </p>
                  <p className="text-muted-foreground">
                    Tiger ID: {selectedFeature.tigerId}
                  </p>
                  <p className="text-muted-foreground">
                    Estimated Range Area: {selectedFeature.area || 18.6} km²
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
