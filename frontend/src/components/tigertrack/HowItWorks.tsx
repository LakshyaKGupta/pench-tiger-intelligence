import { Camera, ScanLine, MapPin, ArrowRight } from "lucide-react";
import { Reveal, SectionHeading } from "./Reveal";

const cards = [
  {
    no: "01",
    tag: "Filter",
    icon: Camera,
    title: "Clean the Data",
    body: "AI automatically detects blank or irrelevant camera-trap frames and safely moves them into quarantine, reducing unnecessary processing.",
    visual: ["Less Noise", "More Intelligence"],
  },
  {
    no: "02",
    tag: "Identify",
    icon: ScanLine,
    title: "Identify Every Tiger",
    body: "Computer vision detects the tiger, isolates its flank and analyzes its unique stripe pattern to match it with known individuals.",
    visual: ["Stripe Pattern", "Tiger ID"],
    match: { id: "PT-017", score: "97.4% Match" },
  },
  {
    no: "03",
    tag: "Track",
    icon: MapPin,
    title: "Understand Movement",
    body: "Every identified tiger is linked to its camera station, timestamp and GPS location to build a persistent movement history.",
    visual: ["Station", "Location", "Movement"],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Method"
          title="How TIGERTRACK AI Works"
          subtitle="Three deterministic stages, run on every batch of field data."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.no} delay={i * 0.12}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-sm border border-border bg-card/60 p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/50 hover:bg-card">
                <div className="pointer-events-none absolute -top-24 -right-24 size-48 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-sm border border-border bg-secondary/60">
                    <c.icon className="size-5 text-primary" />
                  </span>
                  <span className="data-chip text-muted-foreground">
                    {c.no} — {c.tag}
                  </span>
                </div>

                <h3 className="mt-7 font-display text-2xl font-semibold">{c.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.body}</p>

                <div className="mt-auto pt-8">
                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
                    {c.visual.map((v, vi) => (
                      <span key={v} className="flex items-center gap-2">
                        <span className="data-chip text-foreground/80">{v}</span>
                        {vi < c.visual.length - 1 && (
                          <ArrowRight className="size-3 text-primary" />
                        )}
                      </span>
                    ))}
                  </div>
                  {c.match && (
                    <div className="mt-4 flex items-center justify-between rounded-sm border border-primary/25 bg-primary/10 px-3 py-2.5">
                      <span className="font-mono text-sm text-primary">{c.match.id}</span>
                      <span className="data-chip text-primary/80">{c.match.score}</span>
                    </div>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
