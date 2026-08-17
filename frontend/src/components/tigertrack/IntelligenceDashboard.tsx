import { Activity, Camera, PawPrint, Target, ShieldCheck } from "lucide-react";
import { Reveal, SectionHeading } from "./Reveal";
import { Counter } from "./Counter";

const metrics = [
  { icon: PawPrint, value: 10, label: "Sample Tiger Catalog" },
  { icon: Camera, value: 15, label: "Test Images Ingested" },
  { icon: Activity, value: 16, label: "Camera Stations Mapped" },
  { icon: Target, value: 95.1, suffix: "%", decimals: 1, label: "MegaDescriptor Re-ID Sim" },
];

const profile = [
  ["Captures", "6 Sightings"],
  ["Stations Visited", "4 Core Stations"],
  ["Estimated Range", "18.6 km²"],
  ["Last Detected", "Station STN02"],
];

export function IntelligenceDashboard() {
  return (
    <section
      id="intelligence"
      className="relative border-t border-border py-24 night-bg sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Operational Intelligence (Sample Benchmark Dataset)"
          title="From Camera Traps to Wildlife Intelligence."
          subtitle="Real-time operational picture driven directly by local SQLite database queries — automated species triage, individual stripe re-identification, and spatial movement trajectories."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.08}>
              <div className="panel h-full rounded-sm p-6">
                <m.icon className="size-5 text-primary" />
                <p className="mt-6 font-display text-4xl font-semibold tracking-tight">
                  <Counter value={m.value} suffix={m.suffix ?? ""} decimals={m.decimals ?? 0} />
                </p>
                <p className="data-chip mt-2 text-muted-foreground">{m.label}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Reveal delay={0.1}>
            <div className="panel h-full rounded-sm p-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-semibold">
                    Tiger Movement
                  </h3>
                  <p className="data-chip mt-1 text-muted-foreground">
                    Last 30 days · all individuals
                  </p>
                </div>
                <span className="data-chip shrink-0 rounded-sm border border-signal/40 bg-signal/10 px-2 py-1 text-signal">
                  Live
                </span>
              </div>

              <svg viewBox="0 0 600 260" className="mt-6 w-full" role="img" aria-label="Simplified movement path chart across camera stations">
                <defs>
                  <linearGradient id="mv" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="var(--amber)" />
                  </linearGradient>
                </defs>
                {Array.from({ length: 6 }).map((_, i) => (
                  <line
                    key={i}
                    x1="0"
                    x2="600"
                    y1={20 + i * 44}
                    y2={20 + i * 44}
                    stroke="var(--border)"
                    strokeWidth="1"
                  />
                ))}
                <path
                  d="M20 210 C 90 150, 140 190, 200 130 S 300 60, 360 110 S 470 180, 580 60"
                  fill="none"
                  stroke="url(#mv)"
                  strokeWidth="2.5"
                />
                <path
                  d="M20 210 C 90 150, 140 190, 200 130 S 300 60, 360 110 S 470 180, 580 60"
                  fill="none"
                  stroke="var(--amber)"
                  strokeWidth="2"
                  className="animate-trail"
                  opacity="0.85"
                />
                <path
                  d="M20 240 C 120 220, 180 160, 260 190 S 400 220, 580 140"
                  fill="none"
                  stroke="var(--olive)"
                  strokeWidth="1.5"
                  opacity="0.5"
                  strokeDasharray="4 8"
                />
                {[
                  [20, 210],
                  [200, 130],
                  [360, 110],
                  [580, 60],
                ].map(([x, y]) => (
                  <circle key={`${x}`} cx={x} cy={y} r="4" fill="var(--amber)" />
                ))}
              </svg>

              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4">
                {[
                  ["Corridor use", "Amber"],
                  ["Baseline range", "Olive"],
                  ["Detections", "128"],
                ].map(([k, v]) => (
                  <span key={k} className="data-chip text-muted-foreground">
                    {k} · <span className="text-foreground/80">{v}</span>
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="panel flex h-full flex-col rounded-sm p-6">
              <span className="eyebrow">Individual tiger</span>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <h3 className="truncate font-display text-3xl font-semibold text-primary">
                  PT-017
                </h3>
                <span className="data-chip shrink-0 rounded-sm bg-primary/15 px-2 py-1 text-primary">
                  Resident
                </span>
              </div>

              <dl className="mt-6 divide-y divide-border">
                {profile.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 py-3">
                    <dt className="text-sm text-muted-foreground">{k}</dt>
                    <dd className="font-mono text-sm text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-auto flex items-center gap-2 rounded-sm border border-border bg-secondary/40 px-3 py-2.5">
                <Clock className="size-4 shrink-0 text-primary" />
                <span className="data-chip text-muted-foreground">
                  Last run 06:42 AM · movement normal
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
