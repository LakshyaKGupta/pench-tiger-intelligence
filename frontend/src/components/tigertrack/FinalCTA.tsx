import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";
import cta from "@/assets/cta-wild.jpg";

export function FinalCTA() {
  return (
    <section className="relative isolate overflow-hidden border-t border-border">
      <img
        src={cta}
        alt="Tiger walking through tall grass at dusk in a tiger reserve"
        loading="lazy"
        width={1920}
        height={1088}
        className="absolute inset-0 -z-20 size-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,oklch(0.13_0.014_155/0.92),oklch(0.13_0.014_155/0.7))]" />

      <div className="mx-auto max-w-4xl px-5 py-28 text-center sm:px-8 sm:py-40">
        <Reveal>
          <h2 className="text-[clamp(2.1rem,5vw,3.8rem)] leading-[1.02] font-semibold text-balance">
            Turn Camera Traps Into <span className="text-amber-gradient">Conservation Intelligence.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base text-foreground/80">
            AI-assisted monitoring for faster, smarter and more informed wildlife
            conservation.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 rounded-sm btn-amber px-7 py-4 text-sm font-semibold shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
            >
              Enter TIGERTRACK AI
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#pipeline"
              className="inline-flex items-center gap-2 rounded-sm border border-foreground/25 px-7 py-4 text-sm font-medium text-foreground transition-colors hover:bg-foreground/10"
            >
              Explore the System
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
