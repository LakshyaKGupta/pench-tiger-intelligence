import { motion } from "framer-motion";
import { Images, Filter, ScanEye, Fingerprint, IdCard, Route } from "lucide-react";
import { Reveal, SectionHeading } from "./Reveal";

const steps = [
  {
    icon: Images,
    title: "Camera Trap Images",
    detail: "Raw field captures ingested from 86 stations across the reserve.",
    stat: "12,840 frames",
  },
  {
    icon: Filter,
    title: "Blank Image Filtering",
    detail: "Empty and irrelevant frames are quarantined before processing.",
    stat: "63% removed",
  },
  {
    icon: ScanEye,
    title: "Tiger Detection",
    detail: "Detector isolates tigers from other species and night noise.",
    stat: "0.91 mAP",
  },
  {
    icon: Fingerprint,
    title: "Stripe Recognition",
    detail: "Flank crops are embedded into a unique stripe signature.",
    stat: "512-d vector",
  },
  {
    icon: IdCard,
    title: "Individual Identification",
    detail: "Signatures matched against the known individual registry.",
    stat: "94.7% conf.",
  },
  {
    icon: Route,
    title: "Movement Intelligence",
    detail: "Captures resolved into territories, corridors and deviations.",
    stat: "47 profiles",
  },
];

export function IntelligencePipeline() {
  return (
    <section id="pipeline" className="relative min-h-screen flex flex-col justify-center overflow-hidden border-t border-border py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.08]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="From camera trap to intelligence"
          title={
            <>
              Thousands of Images.
              <br />
              <span className="text-muted-foreground">One Intelligent System.</span>
            </>
          }
          subtitle="Camera traps generate enormous volumes of imagery — blank frames triggered by wind, non-target species, and the same tiger captured dozens of times. TIGERTRACK AI transforms that raw stream into structured, verifiable wildlife intelligence."
        />

        <div className="relative mt-16">
          <div className="absolute top-0 bottom-0 left-[27px] w-px bg-border lg:top-[27px] lg:right-0 lg:bottom-auto lg:left-0 lg:h-px lg:w-full" />
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
            style={{ originY: 0 }}
            className="absolute top-0 bottom-0 left-[27px] w-px bg-[linear-gradient(180deg,var(--amber),transparent)] lg:hidden"
          />
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
            style={{ originX: 0 }}
            className="absolute top-[27px] left-0 hidden h-px w-full bg-[linear-gradient(90deg,var(--amber),transparent)] lg:block"
          />

          <ol className="grid gap-8 lg:grid-cols-6 lg:gap-4">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.09}>
                <li className="group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 lg:block">
                  <span className="relative grid size-14 shrink-0 place-items-center rounded-full border border-border bg-card transition-colors group-hover:border-primary/60">
                    <s.icon className="size-5 text-primary" />
                    <span className="absolute inset-0 rounded-full border border-primary/40 animate-pulse-ring" />
                  </span>
                  <div className="min-w-0 lg:mt-6">
                    <span className="data-chip text-primary">0{i + 1}</span>
                    <h3 className="mt-1 font-display text-base font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {s.detail}
                    </p>
                    <span className="data-chip mt-3 inline-block rounded-sm border border-border px-2 py-1 text-foreground/70">
                      {s.stat}
                    </span>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
