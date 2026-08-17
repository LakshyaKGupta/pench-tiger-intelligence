import { useState } from "react";
import { Reveal, SectionHeading } from "./Reveal";

type Marker = {
  id: string;
  x: number;
  y: number;
  station: string;
  confidence: string;
  trend: string;
};

const tigers: Marker[] = [
  { id: "PT-017", x: 34, y: 40, station: "PT-04", confidence: "96%", trend: "Normal" },
  { id: "PT-024", x: 63, y: 30, station: "PT-11", confidence: "92%", trend: "New station" },
  { id: "PT-009", x: 52, y: 68, station: "PT-27", confidence: "89%", trend: "Absent 14d" },
  { id: "PT-031", x: 76, y: 60, station: "PT-19", confidence: "94%", trend: "Normal" },
];

const stations = [
  [18, 24], [29, 55], [41, 22], [46, 47], [58, 62], [69, 41],
  [72, 76], [83, 33], [86, 55], [24, 74], [37, 84], [61, 16],
];

const ranges = [
  { cx: 34, cy: 40, rx: 17, ry: 14 },
  { cx: 63, cy: 32, rx: 14, ry: 12 },
  { cx: 53, cy: 66, rx: 16, ry: 13 },
  { cx: 77, cy: 60, rx: 12, ry: 11 },
];

export function WildlifeMap() {
  const [active, setActive] = useState<Marker | null>(null);

  return (
    <section id="map" className="border-t border-border py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Area occupancy"
          title="See Where They Move."
          subtitle="Map individual tiger territories, activity centres and movement corridors across the reserve."
        />

        <Reveal delay={0.1}>
          <div className="relative mt-12 overflow-hidden rounded-sm border border-border bg-card/50">
            <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.12]" />

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="relative aspect-[4/3] w-full sm:aspect-[16/9]"
              role="img"
              aria-label="Stylized map of Pench Tiger Reserve showing camera stations, tiger locations, home ranges and movement corridors"
            >
              <path
                d="M8 20 L30 9 L58 12 L82 20 L92 44 L86 74 L62 92 L32 88 L12 68 Z"
                fill="color-mix(in oklab, var(--forest) 40%, transparent)"
                stroke="var(--border)"
                strokeWidth="0.4"
              />
              <path
                d="M14 60 C 34 52, 46 66, 62 58 S 84 46, 90 50"
                fill="none"
                stroke="var(--signal)"
                strokeWidth="0.5"
                opacity="0.4"
              />

              {ranges.map((r, i) => (
                <ellipse
                  key={i}
                  cx={r.cx}
                  cy={r.cy}
                  rx={r.rx}
                  ry={r.ry}
                  fill="color-mix(in oklab, var(--amber) 8%, transparent)"
                  stroke="var(--amber)"
                  strokeWidth="0.25"
                  strokeDasharray="1.4 1.6"
                  opacity="0.65"
                />
              ))}

              <path
                d="M34 40 C 44 34, 52 30, 63 30 S 72 48, 77 60"
                fill="none"
                stroke="var(--amber)"
                strokeWidth="0.6"
                className="animate-trail-sm"
              />
              <path
                d="M34 40 C 40 52, 46 62, 53 68"
                fill="none"
                stroke="var(--olive)"
                strokeWidth="0.5"
                className="animate-trail-sm"
                opacity="0.7"
              />

              {stations.map(([x, y]) => (
                <g key={`${x}-${y}`}>
                  <circle cx={x} cy={y} r="0.8" fill="var(--signal)" />
                  <circle cx={x} cy={y} r="1.6" fill="none" stroke="var(--signal)" strokeWidth="0.2" opacity="0.5" />
                </g>
              ))}
            </svg>

            {/* interactive tiger markers */}
            {tigers.map((t) => (
              <button
                key={t.id}
                onMouseEnter={() => setActive(t)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(t)}
                onBlur={() => setActive(null)}
                aria-label={`Tiger ${t.id} near station ${t.station}`}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${t.x}%`, top: `${t.y}%` }}
              >
                <span className="relative grid size-4 place-items-center">
                  <span className="size-2.5 rounded-full bg-primary shadow-[var(--shadow-glow)]" />
                  <span className="absolute inset-0 rounded-full border border-primary/60 animate-pulse-ring" />
                </span>
              </button>
            ))}

            {active && (
              <div
                className="panel pointer-events-none absolute z-10 w-52 -translate-x-1/2 -translate-y-[125%] rounded-sm p-3"
                style={{ left: `${active.x}%`, top: `${active.y}%` }}
              >
                <p className="font-mono text-sm text-primary">{active.id}</p>
                <p className="data-chip mt-2 text-muted-foreground">
                  Last seen: Station {active.station}
                </p>
                <p className="data-chip mt-1 text-muted-foreground">
                  Confidence: {active.confidence}
                </p>
                <p className="data-chip mt-1 text-foreground/80">
                  Movement trend: {active.trend}
                </p>
              </div>
            )}

            <div className="relative flex flex-wrap gap-x-6 gap-y-2 border-t border-border px-5 py-4">
              {[
                ["Camera station", "bg-signal"],
                ["Tiger location", "bg-primary"],
                ["Home range", "bg-primary/30"],
                ["Corridor", "bg-olive"],
              ].map(([label, dot]) => (
                <span key={label} className="data-chip flex items-center gap-2 text-muted-foreground">
                  <span className={`size-2 rounded-full ${dot}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
