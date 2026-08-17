import { Radar } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-primary/40 bg-primary/10">
            <Radar className="size-4 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold tracking-[0.14em]">
              TIGERTRACK AI
            </p>
            <p className="data-chip text-muted-foreground">
              Automated camera-trap triage · Pench Tiger Reserve
            </p>
          </div>
        </div>
        <p className="data-chip text-muted-foreground">
          Demo data shown for evaluation purposes
        </p>
      </div>
    </footer>
  );
}
