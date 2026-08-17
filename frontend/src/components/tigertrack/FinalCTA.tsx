import { Link } from "@tanstack/react-router";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { Reveal } from "./Reveal";
import cta from "@/assets/cta-wild.jpg";

export function FinalCTA() {
  return (
    <section className="relative isolate min-h-screen flex flex-col justify-center overflow-hidden border-t border-border">
      <img
        src={cta}
        alt="Tiger walking through tall grass at dusk in a tiger reserve"
        loading="lazy"
        width={1920}
        height={1088}
        className="absolute inset-0 -z-20 size-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,oklch(0.13_0.014_155/0.92),oklch(0.13_0.014_155/0.7))]" />

      {/* Ambient glow */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[140px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="mx-auto max-w-4xl px-5 py-28 text-center sm:px-8 sm:py-40">
        <Reveal>
          <h2 className="text-[clamp(2.1rem,5vw,3.8rem)] leading-[1.02] font-semibold text-balance">
            Turn Camera Traps Into <span className="text-amber-gradient">Conservation Intelligence.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base text-foreground/80">
            AI-assisted monitoring for faster, smarter and more informed wildlife
            conservation.
          </p>
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-sm btn-amber px-7 py-4 text-sm font-semibold shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
            >
              <LogIn className="size-4" />
              Sign In
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/setup"
              className="group inline-flex items-center gap-2 rounded-sm border border-foreground/30 bg-foreground/10 px-7 py-4 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:bg-foreground/20"
            >
              <UserPlus className="size-4" />
              Sign Up — It's Free
            </Link>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
