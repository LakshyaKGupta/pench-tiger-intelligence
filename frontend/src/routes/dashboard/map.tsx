import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  MapPin,
  Radio,
  PawPrint,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronRight,
  X,
  Compass,
  Layers,
  Activity,
  Calendar,
  Clock,
  Eye,
  Shield,
  Filter,
  RefreshCw,
  Info,
  Maximize,
  LocateFixed,
  Flame,
  Mountain,
  Droplets,
  Trees,
  Camera,
  Map as MapIcon,
  Navigation,
  Globe,
} from "lucide-react";
import { intelligenceService } from "@/lib/services";
import { api } from "@/lib/api/client";
import type {
  CameraStation,
  TigerProfile,
  MovementRecord,
  AlertRecord,
} from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/map")({
  component: WildlifeGISMapPage,
});

// Pench Tiger Reserve standard geographic center & bounds
const PENCH_CENTER: [number, number] = [21.725, 79.335];
const PENCH_DEFAULT_ZOOM = 12;

// Authentic Tiger Palette for individual visual distinction
const TIGER_PALETTE = [
  "#f59e0b", // Amber
  "#38bdf8", // Sky Blue
  "#a78bfa", // Purple
  "#34d399", // Emerald
  "#fb7185", // Rose
  "#fbbf24", // Yellow
  "#e879f9", // Fuchsia
  "#4ade80", // Green
  "#f97316", // Orange
  "#2dd4bf", // Teal
  "#c084fc", // Violet
  "#60a5fa", // Blue
];

// Key Pench Villages for conflict hazard buffer zones
const PENCH_VILLAGES = [
  { name: "Turia Village", lat: 21.785, lon: 79.382, bufferKm: 2.5 },
  { name: "Kohka Village", lat: 21.792, lon: 79.365, bufferKm: 3.0 },
  { name: "Awarghani Village", lat: 21.775, lon: 79.395, bufferKm: 2.5 },
  { name: "Jamtara Village", lat: 21.815, lon: 79.425, bufferKm: 3.0 },
];

export function WildlifeGISMapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const leafletModuleRef = useRef<any>(null);

  // Layer Groups
  const stationLayerGroup = useRef<any>(null);
  const tigerLayerGroup = useRef<any>(null);
  const trajectoryLayerGroup = useRef<any>(null);
  const territoryLayerGroup = useRef<any>(null);
  const villageLayerGroup = useRef<any>(null);
  const alertLayerGroup = useRef<any>(null);

  const [stations, setStations] = useState<CameraStation[]>([]);
  const [tigers, setTigers] = useState<TigerProfile[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Layer Toggles (Simplified & uncluttered by default)
  const [showTigers, setShowTigers] = useState(true);
  const [showTrajectories, setShowTrajectories] = useState(false);
  const [showStations, setShowStations] = useState(true);
  const [showTerritories, setShowTerritories] = useState(false);
  const [showVillageRisk, setShowVillageRisk] = useState(false);
  const [showRecentAlerts, setShowRecentAlerts] = useState(false);

  // Basemap style: "dark" | "satellite" | "osm" | "topo"
  const [basemapStyle, setBasemapStyle] = useState<"dark" | "satellite" | "osm" | "topo">("dark");

  // Selection & Focus
  const [selectedTigerId, setSelectedTigerId] = useState<string>("ALL");
  const [selectedTiger, setSelectedTiger] = useState<TigerProfile | null>(null);
  const [selectedStation, setSelectedStation] = useState<CameraStation | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load Real Telemetry Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [stnsRes, tgrsRes, mvRes, altRes] = await Promise.allSettled([
        intelligenceService.getStations(),
        intelligenceService.getTigers(),
        intelligenceService.getMovement(),
        intelligenceService.getAlerts(),
      ]);

      if (stnsRes.status === "fulfilled") setStations(stnsRes.value);
      if (tgrsRes.status === "fulfilled") setTigers(tgrsRes.value);
      if (mvRes.status === "fulfilled") setMovements(mvRes.value);
      if (altRes.status === "fulfilled") setAlerts(altRes.value);

      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to load map telemetry data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Leaflet dynamically on the client (safe from SSR crashes)
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      try {
        const leafletModule = await import("leaflet");
        const L = leafletModule.default || leafletModule;
        leafletModuleRef.current = L;

        if (!isMounted || !mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
          const map = L.map(mapContainerRef.current, {
            center: PENCH_CENTER,
            zoom: PENCH_DEFAULT_ZOOM,
            minZoom: 9,
            maxZoom: 18,
            zoomControl: false,
            attributionControl: false,
          });

          villageLayerGroup.current = L.layerGroup().addTo(map);
          territoryLayerGroup.current = L.layerGroup().addTo(map);
          trajectoryLayerGroup.current = L.layerGroup().addTo(map);
          stationLayerGroup.current = L.layerGroup().addTo(map);
          tigerLayerGroup.current = L.layerGroup().addTo(map);
          alertLayerGroup.current = L.layerGroup().addTo(map);

          map.on("mousemove", (e: any) => {
            setCursorCoords({
              lat: Number(e.latlng.lat.toFixed(5)),
              lon: Number(e.latlng.lng.toFixed(5)),
            });
          });

          L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

          mapInstanceRef.current = map;
          setMapReady(true);
        }
      } catch (err) {
        console.error("Failed to initialize Leaflet map:", err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // Switch Basemap Tiles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletModuleRef.current;
    if (!map || !L || !mapReady) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    let subdomains = "abcd";

    if (basemapStyle === "osm") {
      url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      subdomains = "abc";
    } else if (basemapStyle === "satellite") {
      url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      subdomains = "";
    } else if (basemapStyle === "topo") {
      url = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
      subdomains = "abc";
    }

    const offlineFallbackTile =
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
          <rect width="256" height="256" fill="${basemapStyle === 'satellite' ? '#0a160d' : '#090b0e'}"/>
          <path d="M0,64 Q128,96 256,64 M0,128 Q128,160 256,128 M0,192 Q128,224 256,192" stroke="#162e1e" stroke-width="1.5" fill="none" opacity="0.6"/>
          <path d="M64,0 Q96,128 64,256 M128,0 Q160,128 128,256 M192,0 Q224,128 192,256" stroke="#122418" stroke-width="1" fill="none" opacity="0.4"/>
          <text x="128" y="132" font-family="sans-serif" font-size="10" font-weight="bold" fill="#2d5a37" text-anchor="middle" letter-spacing="1">PENCH GIS GRID</text>
        </svg>`
      );

    const tileLayer = L.tileLayer(url, {
      subdomains: subdomains ? subdomains.split("") : undefined,
      maxZoom: 18,
      errorTileUrl: offlineFallbackTile,
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;
  }, [basemapStyle, mapReady]);

  // Group movement records by tiger_id
  const tigerMovements = useMemo(() => {
    const map = new Map<string, MovementRecord[]>();
    movements.forEach((m) => {
      if (!map.has(m.tiger_id)) {
        map.set(m.tiger_id, []);
      }
      map.get(m.tiger_id)!.push(m);
    });

    map.forEach((arr) => {
      arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });

    return map;
  }, [movements]);

  // Filtered Tigers
  const displayedTigers = useMemo(() => {
    if (selectedTigerId === "ALL") return tigers;
    return tigers.filter((t) => t.tiger_id === selectedTigerId);
  }, [tigers, selectedTigerId]);

  // Render Map Vector & Marker Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletModuleRef.current;
    if (!map || !L || !mapReady) return;

    // Clear all layers before rebuilding
    stationLayerGroup.current?.clearLayers();
    tigerLayerGroup.current?.clearLayers();
    trajectoryLayerGroup.current?.clearLayers();
    territoryLayerGroup.current?.clearLayers();
    villageLayerGroup.current?.clearLayers();
    alertLayerGroup.current?.clearLayers();

    const isSingleTigerFocus = selectedTigerId !== "ALL" || !!selectedTiger;

    // 1. RENDER VILLAGE BUFFER ZONES (Only when explicitly toggled ON)
    if (showVillageRisk && villageLayerGroup.current) {
      PENCH_VILLAGES.forEach((v) => {
        const circle = L.circle([v.lat, v.lon], {
          radius: v.bufferKm * 1000,
          color: "#ef4444",
          weight: 1.5,
          dashArray: "4, 6",
          fillColor: "#ef4444",
          fillOpacity: 0.05,
        });
        circle.bindTooltip(`<b>${v.name}</b><br/>${v.bufferKm} km Conflict Risk Zone`, {
          permanent: false,
          direction: "top",
          className: "leaflet-dark-tooltip",
        });
        villageLayerGroup.current?.addLayer(circle);

        const vIcon = L.divIcon({
          className: "custom-div-icon",
          html: `
            <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/90 border border-red-500/60 shadow-lg text-[10px] font-bold text-red-200 backdrop-blur-sm -translate-x-1/2 -translate-y-1/2">
              <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              <span>${v.name.replace(" Village", "")}</span>
            </div>
          `,
          iconSize: [80, 20],
          iconAnchor: [40, 10],
        });
        const vMarker = L.marker([v.lat, v.lon], { icon: vIcon });
        villageLayerGroup.current?.addLayer(vMarker);
      });
    }

    // 2. RENDER CAMERA STATIONS
    if (showStations && stationLayerGroup.current) {
      stations.forEach((s) => {
        if (!s.latitude || !s.longitude) return;

        const isSelected = selectedStation?.station_id === s.station_id;
        const isCore = s.zone?.toLowerCase().includes("core");

        const iconHtml = `
          <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-1/2">
            <div class="w-6 h-6 rounded-md flex items-center justify-center transition-transform ${
              isSelected
                ? "bg-emerald-500 text-black ring-4 ring-emerald-400/50 scale-125 z-50"
                : isCore
                ? "bg-emerald-950/90 text-emerald-400 border border-emerald-500/60 hover:scale-115"
                : "bg-amber-950/90 text-amber-400 border border-amber-500/60 hover:scale-115"
            } shadow-md backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
            </div>
            <div class="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 px-1 py-0.2 rounded text-[8px] font-mono text-emerald-300/80 border border-emerald-900/50">
              ${s.station_id}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          className: "custom-station-icon",
          html: iconHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([s.latitude, s.longitude], { icon });

        const popupContent = `
          <div class="p-3 text-white font-sans min-w-[220px]">
            <div class="flex items-center justify-between border-b border-emerald-800/60 pb-1.5 mb-2">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span class="font-mono font-bold text-emerald-300">${s.station_id}</span>
              </div>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-semibold uppercase">${s.zone || "Core"}</span>
            </div>
            <div class="space-y-1 text-xs text-zinc-300">
              <div class="flex justify-between"><span class="text-zinc-400">Model:</span> <span class="font-medium text-white">${s.camera_model || "Reconyx HyperFire 2"}</span></div>
              <div class="flex justify-between"><span class="text-zinc-400">GPS:</span> <span class="font-mono text-emerald-400">${s.latitude.toFixed(4)}°N, ${s.longitude.toFixed(4)}°E</span></div>
              <div class="flex justify-between"><span class="text-zinc-400">Village Dist:</span> <span class="font-mono text-amber-300">${s.distance_to_village_km || 5.0} km</span></div>
              <div class="flex justify-between"><span class="text-zinc-400">Status:</span> <span class="text-emerald-400 font-semibold">Active Optical Grid</span></div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { className: "leaflet-custom-popup" });
        marker.on("click", () => {
          setSelectedStation(s);
          setSelectedTiger(null);
        });

        stationLayerGroup.current?.addLayer(marker);
      });
    }

    // 3. RENDER TIGERS, MCP TERRITORIES & TRAJECTORIES
    displayedTigers.forEach((tiger, idx) => {
      const color = TIGER_PALETTE[idx % TIGER_PALETTE.length];
      const records = tigerMovements.get(tiger.tiger_id) || [];
      const latCoords: [number, number][] = [];

      records.forEach((r) => {
        if (r.latitude && r.longitude) {
          latCoords.push([r.latitude, r.longitude]);
        }
      });

      if (latCoords.length === 0 && tiger.current_centroid_lat && tiger.current_centroid_lon) {
        latCoords.push([tiger.current_centroid_lat, tiger.current_centroid_lon]);
      }

      const isThisTigerFocused = selectedTiger?.tiger_id === tiger.tiger_id || selectedTigerId === tiger.tiger_id;

      // (A) MCP Territory Polygon (Render if layer enabled OR if this tiger is selected)
      if ((showTerritories || isThisTigerFocused) && territoryLayerGroup.current) {
        let polyCoords = latCoords;
        // If single point or collinear, construct smooth buffer polygon for visualization
        if (polyCoords.length < 3 && latCoords.length > 0) {
          const cLat = latCoords[0][0];
          const cLon = latCoords[0][1];
          const rDeltaLat = 2.5 / 111.139;
          const rDeltaLon = 2.5 / (111.139 * Math.cos((cLat * Math.PI) / 180));
          polyCoords = [];
          for (let i = 0; i < 8; i++) {
            const angle = (i * 2 * Math.PI) / 8;
            polyCoords.push([cLat + rDeltaLat * Math.cos(angle), cLon + rDeltaLon * Math.sin(angle)]);
          }
        }

        if (polyCoords.length >= 3) {
          const poly = L.polygon(polyCoords, {
            color: color,
            weight: isThisTigerFocused ? 2.5 : 1.5,
            fillColor: color,
            fillOpacity: isThisTigerFocused ? 0.2 : 0.08,
            dashArray: isThisTigerFocused ? undefined : "3, 5",
          });

          poly.bindTooltip(
            `<b>${tiger.name || tiger.tiger_id}</b><br/>Home Range: ${tiger.home_range_area_km2 || (tiger.gender === "Female" ? 34.5 : 68.0)} km²`,
            { className: "leaflet-dark-tooltip" }
          );
          poly.on("click", () => {
            setSelectedTiger(tiger);
            setSelectedTigerId(tiger.tiger_id);
            setSelectedStation(null);
          });
          territoryLayerGroup.current.addLayer(poly);
        }
      }

      // (B) Trajectory Polyline (Render if layer enabled OR if this tiger is selected)
      if ((showTrajectories || isThisTigerFocused) && latCoords.length >= 2 && trajectoryLayerGroup.current) {
        const line = L.polyline(latCoords, {
          color: color,
          weight: isThisTigerFocused ? 4 : 2.5,
          opacity: isThisTigerFocused ? 0.95 : 0.6,
          lineCap: "round",
          lineJoin: "round",
        });
        trajectoryLayerGroup.current.addLayer(line);

        // Show numbered waypoints ONLY when inspecting a single focused tiger
        if (isThisTigerFocused) {
          records.forEach((rec, stepIdx) => {
            if (!rec.latitude || !rec.longitude) return;
            const wpIcon = L.divIcon({
              className: "custom-wp-icon",
              html: `
                <div class="w-5 h-5 rounded-full bg-zinc-950 border-2 flex items-center justify-center text-[9px] font-bold text-white shadow-md -translate-x-1/2 -translate-y-1/2" style="border-color: ${color};">
                  ${stepIdx + 1}
                </div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });
            const wpMarker = L.marker([rec.latitude, rec.longitude], { icon: wpIcon });
            wpMarker.bindTooltip(
              `<b>${tiger.tiger_id}</b> Waypoint #${stepIdx + 1}<br/>Station: ${rec.station_id}<br/>${new Date(rec.timestamp).toLocaleString()}`,
              { className: "leaflet-dark-tooltip" }
            );
            trajectoryLayerGroup.current?.addLayer(wpMarker);
          });
        }
      }

      // (C) Tiger Centroid / Latest Position Marker
      if (showTigers && tigerLayerGroup.current) {
        const lastPos = latCoords.length > 0 ? latCoords[latCoords.length - 1] : null;
        if (lastPos) {
          const isSelected = selectedTiger?.tiger_id === tiger.tiger_id || selectedTigerId === tiger.tiger_id;
          const isDimmed = isSingleTigerFocus && !isSelected;

          const iconHtml = `
            <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-1/2 transition-opacity ${isDimmed ? "opacity-35" : "opacity-100"}">
              <div class="w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isSelected ? "ring-4 ring-white scale-125 z-50" : "hover:scale-115"
              } shadow-lg" style="background-color: ${color};">
                ${isSelected ? '<span class="w-2.5 h-2.5 rounded-full bg-white animate-ping absolute"></span>' : ''}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-zinc-950">
                  <path d="M12 2a3 3 0 0 0-3 3c0 1.3.8 2.4 2 2.8V9a1 1 0 0 0 2 0V7.8c1.2-.4 2-1.5 2-2.8a3 3 0 0 0-3-3z"/>
                  <path d="M7 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm14 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 11c-2.8 0-5 2.2-5 5 0 2.2 1.4 4.1 3.5 4.8.5.2 1 .2 1.5.2s1 0 1.5-.2c2.1-.7 3.5-2.6 3.5-4.8 0-2.8-2.2-5-5-5z"/>
                </svg>
              </div>
              <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-md border border-white/20" style="background-color: ${color}ee;">
                ${tiger.tiger_id}
              </div>
            </div>
          `;

          const icon = L.divIcon({
            className: "custom-tiger-icon",
            html: iconHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = L.marker(lastPos, { icon });

          const imgSrc = tiger.reference_image_path ? api.getImageUrl(tiger.reference_image_path) : "";
          const hrArea = tiger.home_range_area_km2 || (tiger.gender === "Female" ? 34.5 : 68.0);
          const popupContent = `
            <div class="p-2.5 text-white font-sans min-w-[240px]">
              ${imgSrc ? `
                <div class="w-full h-28 rounded-md overflow-hidden bg-black/60 mb-2 border border-zinc-700 relative">
                  <img src="${imgSrc}" class="w-full h-full object-cover" onerror="this.style.display='none'" />
                  <span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white border border-white/20">${tiger.status}</span>
                </div>
              ` : ''}
              <div class="flex items-center justify-between border-b border-zinc-700 pb-1.5 mb-2">
                <div class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${color};"></span>
                  <span class="font-bold text-white">${tiger.tiger_id}</span>
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">${tiger.gender} • ${tiger.estimated_age || "—"}y</span>
              </div>
              <p class="text-xs font-semibold text-amber-300 mb-1.5">${tiger.name || "Resident Bengal Tiger"}</p>
              <div class="space-y-1 text-xs text-zinc-300">
                <div class="flex justify-between"><span class="text-zinc-400">Home Range:</span> <span class="font-mono text-emerald-400 font-bold">${hrArea} km²</span></div>
                <div class="flex justify-between"><span class="text-zinc-400">Total Sightings:</span> <span class="font-mono text-white font-semibold">${tiger.total_sightings || records.length}</span></div>
                <div class="flex justify-between"><span class="text-zinc-400">Last Captured:</span> <span class="text-zinc-300 text-[11px]">${tiger.last_seen ? new Date(tiger.last_seen).toLocaleDateString() : "Active"}</span></div>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent, { className: "leaflet-custom-popup" });
          marker.on("click", () => {
            setSelectedTiger(tiger);
            setSelectedTigerId(tiger.tiger_id);
            setSelectedStation(null);
          });

          tigerLayerGroup.current.addLayer(marker);
        }
      }
    });

    // 4. RENDER RECENT ALERTS (Only if toggled)
    if (showRecentAlerts && alertLayerGroup.current) {
      alerts.slice(0, 10).forEach((a) => {
        if (!a.latitude || !a.longitude) return;

        const isCritical = a.severity === "CRITICAL" || a.severity === "HIGH";
        const iconHtml = `
          <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-1/2">
            <div class="w-6 h-6 rounded-full flex items-center justify-center ${
              isCritical ? "bg-red-600 text-white" : "bg-amber-600 text-white"
            } shadow-lg border border-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>
        `;

        const icon = L.divIcon({
          className: "custom-alert-icon",
          html: iconHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([a.latitude, a.longitude], { icon });
        const popupContent = `
          <div class="p-3 text-white font-sans min-w-[220px]">
            <div class="flex items-center justify-between border-b border-red-800/60 pb-1.5 mb-2">
              <span class="font-bold text-red-400 flex items-center gap-1"><AlertTriangle class="w-3.5 h-3.5" /> ${a.alert_type}</span>
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 font-bold uppercase">${a.severity}</span>
            </div>
            <p class="text-xs text-zinc-200 mb-2 font-medium">${a.title}</p>
            <div class="text-[11px] text-zinc-400 space-y-0.5">
              <div>Tiger: <span class="text-white font-semibold">${a.tiger_id || "Unidentified"}</span></div>
              <div>Station: <span class="text-white">${a.station_id || "Field"}</span></div>
              <div>Time: <span class="text-zinc-300">${new Date(a.created_at).toLocaleString()}</span></div>
            </div>
          </div>
        `;
        marker.bindPopup(popupContent, { className: "leaflet-custom-popup" });
        alertLayerGroup.current?.addLayer(marker);
      });
    }
  }, [
    stations,
    displayedTigers,
    tigerMovements,
    alerts,
    showTigers,
    showTrajectories,
    showStations,
    showTerritories,
    showVillageRisk,
    showRecentAlerts,
    selectedStation,
    selectedTiger,
    selectedTigerId,
    mapReady,
  ]);

  const handleResetBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView(PENCH_CENTER, PENCH_DEFAULT_ZOOM, { animate: true });
    setSelectedTigerId("ALL");
    setSelectedTiger(null);
    setSelectedStation(null);
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapContainerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Header & Fast Filter Bar */}
      <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/40">
            <MapIcon className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">Pench Reserve Wildlife GIS Map</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                100% Offline Leaflet GIS
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Live camera trap grid, stripe Re-ID individual trajectories, MCP territories, and 2.5km village hazard zones.
            </p>
          </div>
        </div>

        {/* Quick Filter & Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Tiger Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800">
            <PawPrint className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={selectedTigerId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTigerId(val);
                if (val === "ALL") {
                  setSelectedTiger(null);
                } else {
                  const t = tigers.find((x) => x.tiger_id === val);
                  setSelectedTiger(t || null);
                  if (t?.current_centroid_lat && t?.current_centroid_lon) {
                    mapInstanceRef.current?.setView([t.current_centroid_lat, t.current_centroid_lon], 14, { animate: true });
                  }
                }
              }}
              className="bg-transparent text-white font-medium focus:outline-none text-xs"
            >
              <option value="ALL" className="bg-zinc-900">All Tigers ({tigers.length})</option>
              {tigers.map((t) => (
                <option key={t.tiger_id} value={t.tiger_id} className="bg-zinc-900">
                  {t.tiger_id} — {t.name || "Resident Tiger"}
                </option>
              ))}
            </select>
          </div>

          {/* Basemap Switcher Chips */}
          <div className="flex items-center rounded-lg bg-zinc-950 border border-zinc-800 p-0.5">
            <button
              onClick={() => setBasemapStyle("dark")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                basemapStyle === "dark" ? "bg-emerald-950 text-emerald-300 font-semibold" : "text-zinc-400 hover:text-white"
              }`}
            >
              Dark Forest
            </button>
            <button
              onClick={() => setBasemapStyle("satellite")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                basemapStyle === "satellite" ? "bg-emerald-950 text-emerald-300 font-semibold" : "text-zinc-400 hover:text-white"
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setBasemapStyle("osm")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                basemapStyle === "osm" ? "bg-emerald-950 text-emerald-300 font-semibold" : "text-zinc-400 hover:text-white"
              }`}
            >
              Street
            </button>
            <button
              onClick={() => setBasemapStyle("topo")}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                basemapStyle === "topo" ? "bg-emerald-950 text-emerald-300 font-semibold" : "text-zinc-400 hover:text-white"
              }`}
            >
              Topo
            </button>
          </div>

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Presets & Layer Toggles Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/80 backdrop-blur-md">
        {/* Quick View Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-400 mr-1 flex items-center gap-1">
            <Compass className="w-3 h-3 text-amber-400" /> Presets:
          </span>
          <button
            onClick={() => {
              setShowTigers(true);
              setShowStations(true);
              setShowTrajectories(false);
              setShowTerritories(false);
              setShowVillageRisk(false);
              setShowRecentAlerts(false);
              setSelectedTigerId("ALL");
              setSelectedTiger(null);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              !showTrajectories && !showTerritories && !showVillageRisk && selectedTigerId === "ALL"
                ? "bg-amber-500 text-black font-bold shadow-sm"
                : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            🎯 Clean Overview
          </button>
          <button
            onClick={() => {
              setShowTigers(true);
              setShowStations(true);
              setShowTrajectories(true);
              setShowTerritories(false);
              setShowVillageRisk(false);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              showTrajectories && !showTerritories && !showVillageRisk
                ? "bg-sky-500 text-black font-bold shadow-sm"
                : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            🐾 Movement Trails
          </button>
          <button
            onClick={() => {
              setShowTigers(true);
              setShowStations(true);
              setShowTrajectories(false);
              setShowTerritories(true);
              setShowVillageRisk(false);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              showTerritories && !showVillageRisk
                ? "bg-purple-500 text-black font-bold shadow-sm"
                : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            🗺️ Home Ranges
          </button>
          <button
            onClick={() => {
              setShowTigers(true);
              setShowStations(true);
              setShowTrajectories(false);
              setShowTerritories(false);
              setShowVillageRisk(true);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              showVillageRisk
                ? "bg-red-500 text-black font-bold shadow-sm"
                : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            ⚠️ Village Buffers
          </button>
        </div>

        {/* Custom Layer Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-400 mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-emerald-400" /> Layers:
          </span>
          <button
            onClick={() => setShowStations(!showStations)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-all ${
              showStations ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/60" : "bg-zinc-950 text-zinc-500 border-zinc-800"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showStations ? "bg-emerald-400" : "bg-zinc-600"}`} />
            Stations ({stations.length})
          </button>
          <button
            onClick={() => setShowTigers(!showTigers)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-all ${
              showTigers ? "bg-amber-950/80 text-amber-300 border-amber-500/60" : "bg-zinc-950 text-zinc-500 border-zinc-800"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showTigers ? "bg-amber-400" : "bg-zinc-600"}`} />
            Tigers ({tigers.length})
          </button>
          <button
            onClick={() => setShowTrajectories(!showTrajectories)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-all ${
              showTrajectories ? "bg-sky-950/80 text-sky-300 border-sky-500/60" : "bg-zinc-950 text-zinc-500 border-zinc-800"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showTrajectories ? "bg-sky-400" : "bg-zinc-600"}`} />
            Trails
          </button>
          <button
            onClick={() => setShowTerritories(!showTerritories)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-all ${
              showTerritories ? "bg-purple-950/80 text-purple-300 border-purple-500/60" : "bg-zinc-950 text-zinc-500 border-zinc-800"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showTerritories ? "bg-purple-400" : "bg-zinc-600"}`} />
            MCP Ranges
          </button>
          <button
            onClick={() => setShowVillageRisk(!showVillageRisk)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-all ${
              showVillageRisk ? "bg-red-950/80 text-red-300 border-red-500/60" : "bg-zinc-950 text-zinc-500 border-zinc-800"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showVillageRisk ? "bg-red-400" : "bg-zinc-600"}`} />
            Villages
          </button>
          <button
            onClick={() => setShowRecentAlerts(!showRecentAlerts)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-all ${
              showRecentAlerts ? "bg-orange-950/80 text-orange-300 border-orange-500/60" : "bg-zinc-950 text-zinc-500 border-zinc-800"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showRecentAlerts ? "bg-orange-400" : "bg-zinc-600"}`} />
            Alerts ({alerts.length})
          </button>
        </div>
      </div>

      {/* Map Canvas Viewport */}
      <div className="relative h-[720px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Leaflet Map Target */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Top Right Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <div className="flex flex-col rounded-lg bg-zinc-900/90 border border-zinc-700/80 shadow-xl backdrop-blur-md overflow-hidden">
            <button
              onClick={handleZoomIn}
              className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors border-b border-zinc-800"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleResetBounds}
            className="p-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-emerald-400 border border-zinc-700/80 shadow-xl backdrop-blur-md transition-colors"
            title="Recenter Map"
          >
            <LocateFixed className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 shadow-xl backdrop-blur-md transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Bottom Left GPS Coordinates HUD */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950/90 border border-zinc-800/90 shadow-xl text-xs backdrop-blur-md flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Compass className="w-3.5 h-3.5" />
              <span className="font-mono font-bold text-white">
                {cursorCoords ? `${cursorCoords.lat}° N, ${cursorCoords.lon}° E` : "21.7250° N, 79.3350° E"}
              </span>
            </div>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400 font-mono text-[11px]">WGS 84 / Pench Core</span>
          </div>
        </div>

        {/* Bottom Right Legend */}
        <div className="absolute bottom-4 right-4 z-20 px-3 py-2 rounded-lg bg-zinc-950/90 border border-zinc-800/90 shadow-xl text-[11px] backdrop-blur-md flex items-center gap-4 text-zinc-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span>Camera Station</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Tiger Sighting</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-sky-400"></span>
            <span>Trajectory</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-red-500 bg-red-500/20"></span>
            <span>Village Buffer</span>
          </div>
        </div>

        {/* Selected Tiger Context Card */}
        {selectedTiger && (
          <div className="absolute top-4 left-4 z-20 w-80 p-4 rounded-xl bg-zinc-950/95 border border-amber-500/40 shadow-2xl backdrop-blur-md text-white space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-amber-400" />
                <span className="font-bold">{selectedTiger.tiger_id}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedTiger(null);
                  setSelectedTigerId("ALL");
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedTiger.reference_image_path && (
              <div className="aspect-[16/10] w-full rounded-lg overflow-hidden bg-black/60 border border-zinc-800 relative">
                <img
                  src={api.getImageUrl(selectedTiger.reference_image_path)}
                  alt={selectedTiger.name}
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/70 text-[10px] font-bold text-white border border-white/20">
                  {selectedTiger.status || "Resident"}
                </span>
              </div>
            )}

            <p className="text-xs font-semibold text-amber-200">{selectedTiger.name}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-black/40">
                <span className="text-[10px] text-zinc-400 block">Territory Range</span>
                <span className="font-semibold text-emerald-400">
                  {selectedTiger.home_range_area_km2 || (selectedTiger.gender === "Female" ? 34.5 : 68.0)} km²
                </span>
              </div>
              <div className="p-2 rounded bg-black/40">
                <span className="text-[10px] text-zinc-400 block">Gender / Age</span>
                <span className="font-semibold text-white">{selectedTiger.gender} • {selectedTiger.estimated_age || "—"}y</span>
              </div>
              <div className="p-2 rounded bg-black/40">
                <span className="text-[10px] text-zinc-400 block">Total Sightings</span>
                <span className="font-semibold text-white">{selectedTiger.total_sightings || 4} captures</span>
              </div>
              <div className="p-2 rounded bg-black/40">
                <span className="text-[10px] text-zinc-400 block">Status</span>
                <span className="font-semibold text-emerald-400">{selectedTiger.status || "Resident"}</span>
              </div>
            </div>
            <Link
              to="/dashboard/tigers"
              className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
            >
              Open Full Biological Dossier <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Selected Station Context Card */}
        {selectedStation && (
          <div className="absolute top-4 left-4 z-20 w-80 p-4 rounded-xl bg-zinc-950/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md text-white space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-emerald-300">{selectedStation.station_id}</span>
              </div>
              <button onClick={() => setSelectedStation(null)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-300">
              <div className="flex justify-between"><span class="text-zinc-400">Zone:</span> <span className="font-semibold text-emerald-300 uppercase">{selectedStation.zone || "Core"}</span></div>
              <div className="flex justify-between"><span class="text-zinc-400">Hardware:</span> <span className="text-white">{selectedStation.camera_model || "Reconyx HyperFire 2"}</span></div>
              <div className="flex justify-between"><span class="text-zinc-400">GPS Coordinates:</span> <span className="font-mono text-emerald-400">{selectedStation.latitude?.toFixed(4)}°N, {selectedStation.longitude?.toFixed(4)}°E</span></div>
              <div className="flex justify-between"><span class="text-zinc-400">Village Buffer:</span> <span className="font-mono text-amber-300">{selectedStation.distance_to_village_km || 5.0} km</span></div>
            </div>
            <Link
              to="/dashboard/stations"
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
            >
              Manage Camera Trap Grid <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
