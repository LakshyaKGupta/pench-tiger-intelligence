import { LucideIcon } from "lucide-react";
import { Counter } from "../tigertrack/Counter";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  suffix?: string;
  decimals?: number;
  subtitle?: string;
  trend?: string;
  variant?: "default" | "signal" | "alert" | "amber";
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  decimals = 0,
  subtitle,
  trend,
  variant = "default",
}: MetricCardProps) {
  const variantStyles = {
    default: {
      border: "border-border",
      iconBg: "bg-secondary text-foreground",
      accent: "text-foreground",
    },
    amber: {
      border: "border-primary/40",
      iconBg: "bg-primary/10 text-primary",
      accent: "text-primary",
    },
    signal: {
      border: "border-signal/40",
      iconBg: "bg-signal/10 text-signal",
      accent: "text-signal",
    },
    alert: {
      border: "border-destructive/40",
      iconBg: "bg-destructive/10 text-destructive",
      accent: "text-destructive",
    },
  };

  const style = variantStyles[variant];

  return (
    <div className={`panel relative rounded-sm p-5 transition-all hover:border-primary/50 ${style.border}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`grid size-9 place-items-center rounded-sm ${style.iconBg}`}>
          <Icon className="size-4.5" />
        </div>
        {trend && (
          <span className="data-chip rounded-sm bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            {trend}
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="font-display text-3xl font-bold tracking-tight text-foreground">
          {typeof value === "number" ? (
            <Counter value={value} suffix={suffix} decimals={decimals} />
          ) : (
            <span>
              {value}
              {suffix}
            </span>
          )}
        </p>
        <p className="data-chip mt-1.5 font-medium text-muted-foreground">{label}</p>
        {subtitle && (
          <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
