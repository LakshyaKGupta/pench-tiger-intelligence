import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal, SectionHeading } from "./Reveal";
import { Camera, Activity, TrendingUp, AlertTriangle, MapPin, X } from "lucide-react";

// Pench Tiger Reserve — real coordinates
// Reserve boundary (approx): 21.6–21.95°N, 79.1–79.55°E
// Center: 21.75°N, 79.33°E

type Tiger = {
  id: string;
  lat: number;
  lng: number;
  station: string;
  confidence: string;
  trend: string;
  trendColor: string;
  color: string;
  // Movement trail: array of [lat, lng]
  trail: [number, number][];
};

const tigers: Tiger[] = [
  {
    id: "PT-017",
    lat: 21.82,
    lng: 79.28,
    station: "CAM-04",
    confidence: "96%",
    trend: "Normal",
    trendColor: "#34d399",
    color: "#f59e0b",
    trail: [
      [21.795, 79.24], [21.803, 79.255], [21.811, 79.261],
      [21.818, 79.272], [21.82, 79.28], [21.824, 79.291],
      [21.829, 79.299],
    ],
  },
  {
    id: "PT-024",
    lat: 21.73,
    lng: 79.41,
    station: "CAM-11",
    confidence: "92%",
    trend: "New station",
    trendColor: "#fbbf24",
    color: "#60a5fa",
    trail: [
      [21.755, 79.38], [21.748, 79.39], [21.742, 79.397],
      [21.736, 79.403], [21.73, 79.41], [21.722, 79.415],
      [21.716, 79.42],
    ],
  },
  {
    id: "PT-009",
    lat: 21.68,
    lng: 79.31,
    station: "CAM-27",
    confidence: "89%",
    trend: "Absent 14d",
    trendColor: "#f87171",
    color: "#a78bfa",
    trail: [
      [21.71, 79.27], [21.703, 79.282], [21.696, 79.291],
      [21.69, 79.302], [21.684, 79.308], [21.68, 79.31],
    ],
  },
  {
    id: "PT-031",
    lat: 21.79,
    lng: 79.46,
    station: "CAM-19",
    confidence: "94%",
    trend: "Normal",
    trendColor: "#34d399",
    color: "#fb923c",
    trail: [
      [21.77, 79.43], [21.775, 79.438], [21.781, 79.447],
      [21.786, 79.454], [21.79, 79.46], [21.793, 79.469],
    ],
  },
];

const cameraStations: { id: string; lat: number; lng: number }[] = [
  { id: "CAM-01", lat: 21.85, lng: 79.22 },
  { id: "CAM-04", lat: 21.82, lng: 79.28 },
  { id: "CAM-07", lat: 21.80, lng: 79.35 },
  { id: "CAM-11", lat: 21.73, lng: 79.41 },
  { id: "CAM-14", lat: 21.76, lng: 79.25 },
  { id: "CAM-19", lat: 21.79, lng: 79.46 },
  { id: "CAM-23", lat: 21.70, lng: 79.38 },
  { id: "CAM-27", lat: 21.68, lng: 79.31 },
  { id: "CAM-31", lat: 21.72, lng: 79.48 },
  { id: "CAM-33", lat: 21.86, lng: 79.42 },
  { id: "CAM-36", lat: 21.65, lng: 79.44 },
  { id: "CAM-39", lat: 21.88, lng: 79.33 },
];

const stats = [
  { icon: Camera, label: "Active Stations", value: "12" },
  { icon: Activity, label: "Tigers Tracked", value: "4" },
  { icon: TrendingUp, label: "Avg Confidence", value: "92.8%" },
  { icon: AlertTriangle, label: "Active Alerts", value: "1" },
];

export function WildlifeMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [activeT, setActiveT] = useState<Tiger | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    // Dynamically load leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Import leaflet
    import("leaflet").then((L) => {
      const Leaflet = L.default || L;

      const map = Leaflet.map(mapRef.current!, {
        center: [21.77, 79.35],
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      });

      // Dark satellite / terrain tile layer
      Leaflet.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "© CARTO",
          subdomains: "abcd",
          maxZoom: 20,
        }
      ).addTo(map);

      // Lightweight attribution
      Leaflet.control
        .attribution({ position: "bottomright", prefix: false })
        .addTo(map);

      // Custom zoom control (top-right)
      Leaflet.control.zoom({ position: "topright" }).addTo(map);

      // Draw tiger movement trails
      tigers.forEach((tiger) => {
        // Trail polyline (dashed, with animated style via className)
        const poly = Leaflet.polyline(tiger.trail, {
          color: tiger.color,
          weight: 2.5,
          opacity: 0.75,
          dashArray: "6 8",
        }).addTo(map);

        // Arrowhead at latest position (last segment)
        const len = tiger.trail.length;
        if (len >= 2) {
          const from = tiger.trail[len - 2];
          const to = tiger.trail[len - 1];
          const angle = Math.atan2(
            to[1] - from[1],
            to[0] - from[0]
          );
          const arrowIcon = Leaflet.divIcon({
            className: "",
            html: `<div style="
              width:0;height:0;
              border-left: 7px solid transparent;
              border-right: 7px solid transparent;
              border-bottom: 13px solid ${tiger.color};
              transform: rotate(${(angle * 180) / Math.PI - 90}deg);
              opacity:0.9;
            "></div>`,
            iconSize: [14, 13],
            iconAnchor: [7, 6],
          });
          Leaflet.marker([to[0], to[1]], { icon: arrowIcon }).addTo(map);
        }

        // Tiger marker (pulsing dot)
        const tigerIcon = Leaflet.divIcon({
          className: "",
          html: `<div class="tt-tiger-dot" style="background:${tiger.color};box-shadow:0 0 0 0 ${tiger.color}66;">
                   <div class="tt-tiger-ring" style="border-color:${tiger.color}"></div>
                 </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = Leaflet.marker([tiger.lat, tiger.lng], {
          icon: tigerIcon,
          zIndexOffset: 1000,
        }).addTo(map);

        // Label tooltip
        marker.bindTooltip(
          `<div class="tt-map-tooltip">
             <span class="tt-id">${tiger.id}</span>
             <span class="tt-chip">${tiger.station}</span>
             <span class="tt-conf" style="color:${tiger.trendColor}">● ${tiger.trend}</span>
             <span class="tt-chip">Confidence: ${tiger.confidence}</span>
           </div>`,
          {
            permanent: false,
            direction: "top",
            offset: [0, -14],
            className: "tt-tooltip-wrap",
          }
        );

        markersRef.current.push({ marker, tiger });
      });

      // Camera station markers
      cameraStations.forEach((cam) => {
        const camIcon = Leaflet.divIcon({
          className: "",
          html: `<div class="tt-cam-dot"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        Leaflet.marker([cam.lat, cam.lng], { icon: camIcon })
          .bindTooltip(cam.id, {
            direction: "top",
            className: "tt-tooltip-wrap tt-cam-tip",
          })
          .addTo(map);
      });

      leafletRef.current = map;
      setMapReady(true);

      // Force resize in case DOM isn't fully painted
      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, []);

  return (
    <section
      id="map"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden border-t border-border py-20 sm:py-28"
    >
      {/* CSS for custom markers & tooltips injected inline */}
      <style>{`
        .tt-tiger-dot {
          width: 18px; height: 18px;
          border-radius: 50%;
          position: relative;
          animation: tt-pulse 2s ease-in-out infinite;
        }
        .tt-tiger-ring {
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          border: 1.5px solid;
          opacity: 0;
          animation: tt-ring 2s ease-out infinite;
        }
        @keyframes tt-pulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.18); }
        }
        @keyframes tt-ring {
          0% { transform: scale(0.7); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        .tt-cam-dot {
          width: 9px; height: 9px;
          border-radius: 50%;
          background: #2dd4bf;
          border: 1px solid rgba(45,212,191,0.5);
          box-shadow: 0 0 6px rgba(45,212,191,0.6);
        }
        .leaflet-container {
          background: #0d1a14 !important;
          font-family: inherit;
        }
        .tt-tooltip-wrap {
          background: rgba(10, 20, 15, 0.95) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 6px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
          padding: 0 !important;
          white-space: nowrap;
        }
        .tt-tooltip-wrap::before { display: none !important; }
        .tt-map-tooltip {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 10px 13px;
        }
        .tt-id {
          font-family: monospace;
          font-size: 13px;
          font-weight: 700;
          color: #f5f5f4;
          letter-spacing: 0.03em;
        }
        .tt-chip {
          font-size: 11px;
          color: #a8a29e;
        }
        .tt-conf {
          font-size: 11px;
          font-weight: 600;
        }
        .tt-cam-tip {
          padding: 4px 8px !important;
          font-size: 11px;
          color: #a8a29e !important;
          background: rgba(10,20,15,0.9) !important;
        }
        .leaflet-control-zoom {
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 6px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: rgba(10,20,15,0.9) !important;
          color: #a8a29e !important;
          border: none !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(30,50,35,0.95) !important;
          color: #f5f5f4 !important;
        }
        .leaflet-control-attribution {
          background: rgba(10,20,15,0.7) !important;
          color: #57534e !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a { color: #78716c !important; }
      `}</style>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 w-full">
        <SectionHeading
          eyebrow="Area occupancy"
          title={
            <>
              See Where{" "}
              <span className="text-amber-gradient">They Move.</span>
            </>
          }
          subtitle="Live tiger locations, home ranges, and movement corridors plotted on Pench Tiger Reserve's real terrain."
        />

        {/* Stats row */}
        <Reveal delay={0.1}>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(({ icon: Icon, label, value }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 + i * 0.07, duration: 0.55 }}
                whileHover={{ scale: 1.03, y: -2 }}
                className="flex items-center gap-3 rounded-sm border border-border bg-card/70 px-4 py-3 backdrop-blur-sm"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-primary/30 bg-primary/10">
                  <Icon className="size-4 text-primary" />
                </span>
                <div>
                  <div className="font-display text-lg font-semibold text-foreground">{value}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </Reveal>

        {/* Map panel */}
        <Reveal delay={0.15}>
          <div className="relative mt-8 overflow-hidden rounded-sm border border-border bg-[#0d1a14]">
            {/* Title bar */}
            <div className="flex items-center gap-3 border-b border-border bg-card/60 px-5 py-3 backdrop-blur-sm">
              <motion.span
                className="size-2 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="data-chip text-muted-foreground">
                LIVE · Pench Tiger Reserve — Core &amp; Buffer Zone
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground/60">
                21.77°N 79.35°E
              </span>
            </div>

            {/* Leaflet map */}
            <div
              ref={mapRef}
              className="relative w-full"
              style={{ height: "520px" }}
            >
              {!mapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0d1a14]">
                  <motion.div
                    className="flex flex-col items-center gap-3"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <MapPin className="size-7 text-primary" />
                    <span className="data-chip text-muted-foreground">Loading map…</span>
                  </motion.div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border bg-card/60 px-5 py-4">
              <span className="data-chip flex items-center gap-2 text-muted-foreground">
                <span className="size-2.5 rounded-full bg-teal-400" />
                Camera station
              </span>
              <span className="data-chip flex items-center gap-2 text-muted-foreground">
                <span className="size-2.5 rounded-full bg-amber-400" />
                Tiger location
              </span>
              <span className="data-chip flex items-center gap-2 text-muted-foreground">
                <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-amber-400/70" />
                Movement trail
              </span>
              <span className="data-chip ml-auto text-muted-foreground/60 hidden sm:block">
                Hover tiger dot for details
              </span>
            </div>
          </div>
        </Reveal>

        {/* Tiger list cards below map */}
        <Reveal delay={0.25}>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tigers.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 + i * 0.06, duration: 0.5 }}
                whileHover={{ scale: 1.03, y: -2 }}
                className="flex items-start gap-3 rounded-sm border border-border bg-card/60 p-3 cursor-pointer backdrop-blur-sm"
                onClick={() => leafletRef.current?.flyTo([t.lat, t.lng], 13, { duration: 1.2 })}
              >
                <span
                  className="mt-0.5 size-3 shrink-0 rounded-full"
                  style={{ background: t.color, boxShadow: `0 0 8px ${t.color}99` }}
                />
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-foreground">{t.id}</p>
                  <p className="data-chip mt-0.5 text-muted-foreground truncate">{t.station}</p>
                  <p className="data-chip mt-0.5 font-medium" style={{ color: t.trendColor }}>
                    {t.trend}
                  </p>
                </div>
                <span className="ml-auto shrink-0 text-[11px] font-mono text-primary">{t.confidence}</span>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
