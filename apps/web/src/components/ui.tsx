import clsx from "clsx";

const STYLES = {
  optimal: "bg-green-500/15 text-green-400 border-green-500/30",
  restricted: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  disrupted: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function StatusBadge({
  status,
  label,
}: {
  status: "optimal" | "restricted" | "disrupted" | string;
  label?: string;
}) {
  const key = status.toLowerCase().includes("shutdown") || status === "CRITICAL"
    ? "disrupted"
    : status.toLowerCase().includes("restrict") || status === "WARNING" || status === "HIGH_PRIORITY"
      ? "restricted"
      : status === "optimal" || status === "ACTIVE" || status === "INFO"
        ? "optimal"
        : (status as keyof typeof STYLES);

  return (
    <span className={clsx("px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wide", STYLES[key] ?? STYLES.optimal)}>
      {label ?? status}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "optimal" | "restricted" | "disrupted";
}) {
  const border = accent === "disrupted" ? "border-red-500/40" : accent === "restricted" ? "border-orange-500/40" : "border-slate-700";
  return (
    <div className={clsx("rounded-lg border bg-panel p-4", border)}>
      <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold mt-1 tabular-nums">{value}</p>
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  status = "optimal",
}: {
  value: number;
  max: number;
  status?: "optimal" | "restricted" | "disrupted";
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColor =
    status === "disrupted" ? "bg-red-500" : status === "restricted" ? "bg-orange-500" : "bg-green-500";

  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-500 tabular-nums">{pct.toFixed(0)}% utilized</p>
    </div>
  );
}
