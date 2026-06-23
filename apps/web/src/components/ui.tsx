import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  noPadding,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <section
      className={clsx(
        "rounded-xl border border-slate-800/80 bg-panel/90 shadow-panel backdrop-blur-sm",
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-slate-800/80 px-5 py-4">
          <div>
            {title && (
              <h2 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h2>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function KpiTile({
  label,
  value,
  unit,
  trend,
  status = "neutral",
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  status?: "neutral" | "optimal" | "restricted" | "disrupted";
  icon?: ReactNode;
}) {
  const border =
    status === "disrupted"
      ? "border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.08)]"
      : status === "restricted"
        ? "border-amber-500/30"
        : status === "optimal"
          ? "border-emerald-500/20"
          : "border-slate-800/80";

  return (
    <div
      className={clsx(
        "rounded-xl border bg-panel/90 p-4 shadow-panel transition-colors hover:bg-surface-elevated/80",
        border
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">{label}</p>
        {icon && <span className="text-accent/70">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
      {trend && <p className="mt-1 text-xs text-slate-500">{trend}</p>}
    </div>
  );
}

export function StatusBadge({
  status,
  label,
  pulse,
}: {
  status: string;
  label?: string;
  pulse?: boolean;
}) {
  const normalized = status.toUpperCase();
  const style =
    normalized.includes("SHUTDOWN") || normalized === "CRITICAL" || status === "disrupted"
      ? "bg-red-500/10 text-red-400 border-red-500/30"
      : normalized.includes("RESTRICT") ||
          normalized === "WARNING" ||
          normalized === "HIGH_PRIORITY" ||
          status === "restricted"
        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border",
        style
      )}
    >
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-glow" />
      )}
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  status = "optimal",
  showLabel = true,
}: {
  value: number;
  max: number;
  status?: "optimal" | "restricted" | "disrupted";
  showLabel?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColor =
    status === "disrupted"
      ? "bg-gradient-to-r from-red-600 to-red-400"
      : status === "restricted"
        ? "bg-gradient-to-r from-amber-600 to-amber-400"
        : "bg-gradient-to-r from-cyan-600 to-emerald-400";

  return (
    <div className="space-y-1.5">
      <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all duration-700", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-[10px] text-slate-500 font-mono tabular-nums">{pct.toFixed(1)}% utilized</p>
      )}
    </div>
  );
}
