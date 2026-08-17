import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import tiger from "@/assets/tiger-hero.png";
import forest from "@/assets/forest-night.jpg";

const dataCards = [
  { label: "Sample Profile", value: "T-PENCH-001", pos: "left-[4%] top-[26%]" },
  { label: "Re-ID Match", value: "95.1% Sim", pos: "right-[5%] top-[20%]" },
  { label: "Field Sighting", value: "08:30 AM", pos: "right-[8%] bottom-[26%]" },
  { label: "Station STN02", value: "Pench Core", pos: "left-[7%] bottom-[20%]" },
];

function useMouseParallax(reduced: boolean) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setPos({
        x: (e.clientX - r.left) / r.width - 0.5,
        y: (e.clientY - r.top) / r.height - 0.5,
      });
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [reduced]);

  return { ref, pos };
}

export function Hero() {
  const reduced = !!useReducedMotion();
  const { ref, pos } = useMouseParallax(reduced);

  const shift = (depth: number) => ({
    transform: `translate3d(${pos.x * depth}px, ${pos.y * depth}px, 0)`,
  });

  return (
    <section
      id="home"
      ref={ref}
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden night-bg pt-28 pb-16 sm:pt-32"
    >
      {/* depth layer 1: forest */}
      <div
        className="pointer-events-none absolute inset-0 -z-30 transition-transform duration-300 ease-out"
        style={shift(14)}
      >
        <img
          src={forest}
          alt=""
          aria-hidden="true"
          width={1920}
          height={1088}
          className="size-full scale-110 object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-[var(--gradient-night)] opacity-80" />
      </div>

      {/* depth layer 2: grid + glow */}
      <div className="pointer-events-none absolute inset-0 -z-20 grid-lines opacity-[0.18]" />
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -z-20 size-[38rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px] transition-transform duration-500"
        style={shift(-26)}
      />

      {/* particles */}
      {!reduced && (
        <div className="pointer-events-none absolute inset-0 -z-10" style={shift(30)}>
          {Array.from({ length: 22 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute size-[3px] rounded-full bg-primary/60"
              style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
              animate={{ y: [0, -26, 0], opacity: [0.15, 0.7, 0.15] }}
              transition={{
                duration: 7 + (i % 5),
                repeat: Infinity,
                delay: i * 0.35,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="max-w-2xl"
        >
          <span className="eyebrow inline-flex items-center gap-2 rounded-sm border border-border px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-signal" />
            Autonomous Camera-Trap Intelligence · 100% Offline
          </span>

          <h1 className="mt-7 text-[clamp(2.6rem,7vw,5rem)] leading-[0.95] font-semibold text-balance">
            Every Stripe <span className="text-amber-gradient">Tells a Story.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-foreground/80">
            Field teams in Pench collect more images than anyone can look through. We read
            the stripes, so the forest staff can read the story.
          </p>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Blank frames get set aside, each tiger gets recognised by its own stripe
            pattern, and movement across the reserve is mapped week after week.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 rounded-sm btn-amber px-6 py-3.5 text-sm font-semibold shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
            >
              Launch Operational Dashboard
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-sm border border-border px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Play className="size-4 text-primary" />
              See How It Works
            </a>
          </div>

          <div className="mt-12 border-t border-border pt-6">
            <dl className="grid max-w-lg grid-cols-3 gap-4">
              {[
                ["100%", "Offline Operation", "Zero Cloud Required"],
                ["7-Stage", "Autonomous AI", "MegaDescriptor Re-ID"],
                ["SQLite", "Source of Truth", "Local ACID Persistence"],
              ].map(([v, l, sub]) => (
                <div key={l}>
                  <dt className="font-display text-xl font-semibold text-foreground">{v}</dt>
                  <dd className="data-chip mt-1 text-muted-foreground font-medium">{l}</dd>
                  <span className="text-[10px] text-muted-foreground/70 block mt-0.5">{sub}</span>
                </div>
              ))}
            </dl>
          </div>
        </motion.div>

        {/* Tiger visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto aspect-square w-full max-w-[34rem]"
        >
          <div
            className="absolute inset-0 transition-transform duration-500 ease-out"
            style={shift(-18)}
          >
            <div className="absolute inset-[12%] rounded-full bg-primary/15 blur-[90px]" />
          </div>

          <div
            className="relative size-full transition-transform duration-300 ease-out"
            style={shift(22)}
          >
            <div className={reduced ? "size-full" : "size-full animate-prowl"}>
              <div className={`relative size-full ${reduced ? "" : "animate-gait"}`}>
                <img
                  src={tiger}
                  alt="Bengal tiger walking slowly through low forest light at night"
                  width={1280}
                  height={1280}
                  className="size-full origin-bottom object-contain tiger-mask animate-breathe drop-shadow-[0_30px_60px_oklch(0.05_0.02_155/0.8)]"
                />
                {!reduced && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute top-[46%] left-1/2 h-[3%] w-[26%] -translate-x-1/2 rounded-full bg-[oklch(0.16_0.012_150)]"
                    animate={{ scaleY: [0, 0, 1, 0, 0] }}
                    transition={{ duration: 6.5, repeat: Infinity, times: [0, 0.82, 0.86, 0.9, 1] }}
                    style={{ transformOrigin: "center" }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* floating data cards */}
          {dataCards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.18, duration: 0.7 }}
              className={`absolute ${c.pos} panel animate-drift rounded-sm px-3 py-2`}
              style={{
                ...shift(34 + i * 6),
                animationDelay: `${i * 1.4}s`,
              }}
            >
              <span className="data-chip block text-muted-foreground">{c.label}</span>
              <span className="font-mono text-sm text-primary">{c.value}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
