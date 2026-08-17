import { motion } from "framer-motion";
import { TriangleAlert, MapPinPlus, EyeOff } from "lucide-react";
import { Reveal, SectionHeading } from "./Reveal";

const alerts = [
  {
    type: "Range Shift",
    severity: "High",
    tone: "text-alert border-alert/40 bg-alert/10",
    icon: TriangleAlert,
    id: "PT-017",
    change: "PT-017 moved beyond its established activity range.",
    confidence: "93%",
    evidence: "6 captures outside 95% kernel range · Stations PT-31, PT-33",
  },
  {
    type: "New Station",
    severity: "Medium",
    tone: "text-primary border-primary/40 bg-primary/10",
    icon: MapPinPlus,
    id: "PT-024",
    change: "PT-024 detected at a previously unused camera station.",
    confidence: "88%",
    evidence: "First-ever detection at Station PT-11 · 2 matched flank crops",
  },
  {
    type: "Prolonged Absence",
    severity: "Watch",
    tone: "text-signal border-signal/40 bg-signal/10",
    icon: EyeOff,
    id: "PT-009",
    change: "PT-009 has not been detected within its expected activity period.",
    confidence: "81%",
    evidence: "0 detections in 14 days vs. 9-day historical mean interval",
  },
];

export function AlertSection() {
  return (
    <section
      id="alerts"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden border-t border-border bg-forest-deep py-20 sm:py-24"
    >
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.1]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Deviation detection"
          title="Know When Something Changes."
          subtitle="Every processing run is compared against historical movement patterns for each individual. When behaviour departs from its baseline, the system raises an evidence-backed alert instead of a raw notification."
        />

        <div className="mt-14 grid gap-4">
          {alerts.map((a, i) => (
            <Reveal key={a.type} delay={i * 0.12}>
              <motion.article
                whileHover={{ x: 6 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="grid gap-5 rounded-sm border border-border bg-card/60 p-6 lg:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-sm border ${a.tone}`}>
                    <a.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <span className="data-chip block text-muted-foreground">{a.severity}</span>
                    <span className="block truncate font-display text-sm font-semibold tracking-wide">
                      {a.type.toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-foreground/85">{a.change}</p>

                <p className="data-chip text-muted-foreground">{a.evidence}</p>

                <div className="flex items-center gap-3 lg:flex-col lg:items-end">
                  <span className="font-mono text-sm text-primary">{a.id}</span>
                  <span className="data-chip rounded-sm border border-border px-2 py-1 text-foreground/70">
                    conf {a.confidence}
                  </span>
                </div>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
