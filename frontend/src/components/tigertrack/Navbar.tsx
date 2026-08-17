import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, LogIn, UserPlus, Radar } from "lucide-react";

const links = [
  { label: "Home", href: "#home" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pipeline", href: "#pipeline" },
  { label: "Intelligence", href: "#intelligence" },
  { label: "Wildlife Map", href: "#map" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 z-50 w-full px-3 pt-3 sm:px-6 sm:pt-5"
    >
      <div
        className={`mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-sm px-4 py-3 transition-all duration-500 lg:grid-cols-[auto_1fr_auto] sm:px-6 ${
          scrolled
            ? "panel shadow-[var(--shadow-deep)]"
            : "border border-transparent bg-transparent"
        }`}
      >
        <a href="#home" className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-primary/40 bg-primary/10">
            <Radar className="size-4 text-primary" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-semibold tracking-[0.14em] text-foreground">
              TIGERTRACK AI
            </span>
            <span className="data-chip block truncate text-muted-foreground">
              Pench Tiger Reserve
            </span>
          </span>
        </a>

        <nav className="hidden items-center justify-center gap-8 lg:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/login"
            className="hidden items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-secondary sm:inline-flex"
          >
            <LogIn className="size-4" /> Sign In
          </Link>
          <Link
            to="/setup"
            className="hidden items-center gap-2 rounded-sm btn-amber px-4 py-2 text-sm font-semibold shadow-[var(--shadow-glow)] sm:inline-flex"
          >
            <UserPlus className="size-4" /> Sign Up
          </Link>
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-sm border border-border text-foreground lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="panel mx-auto mt-2 max-w-7xl rounded-sm p-2 lg:hidden"
          >
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-sm px-4 py-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-1 flex gap-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-border px-4 py-3 text-sm font-medium text-foreground"
              >
                <LogIn className="size-4" /> Sign In
              </Link>
              <Link
                to="/setup"
                onClick={() => setOpen(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-primary/15 px-4 py-3 text-sm font-medium text-primary"
              >
                <UserPlus className="size-4" /> Sign Up
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
