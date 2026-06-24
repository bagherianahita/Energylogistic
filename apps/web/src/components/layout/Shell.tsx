"use client";

import { clsx } from "clsx";
import {
  LayoutDashboard,
  GitBranch,
  Droplets,
  AlertTriangle,
  Activity,
  Settings,
  Radio,
} from "lucide-react";

export type NavSection = "overview" | "network" | "blending" | "incidents" | "integrations";

const NAV: { id: NavSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Operations Overview", icon: LayoutDashboard },
  { id: "network", label: "Pipeline Network", icon: GitBranch },
  { id: "blending", label: "Diluent Blending", icon: Droplets },
  { id: "incidents", label: "Disruption Control", icon: AlertTriangle },
  { id: "integrations", label: "SCADA & ERP", icon: Radio },
];

export function Sidebar({
  active,
  onNavigate,
}: {
  active: NavSection;
  onNavigate: (s: NavSection) => void;
}) {
  return (
    <aside className="hidden lg:flex w-60 flex-col border-r border-slate-800/80 bg-surface-elevated/90 shrink-0">
      <div className="px-5 py-5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-glow">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight leading-none">energy-Logix</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">MES Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
              active === id
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="font-medium text-left">{label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Settings className="w-3.5 h-3.5" />
          <span>v1.0 · Lloydminster Thermal</span>
        </div>
      </div>
    </aside>
  );
}

export function TopBar({
  lastUpdated,
  systemStatus,
}: {
  lastUpdated: Date | null;
  systemStatus: "optimal" | "restricted" | "disrupted";
}) {
  const statusLabel =
    systemStatus === "disrupted" ? "System Alert" : systemStatus === "restricted" ? "Degraded" : "Nominal";

  return (
    <header className="h-14 border-b border-slate-800/80 bg-surface-elevated/80 backdrop-blur-md flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-semibold text-slate-200 lg:hidden">energy-Logix</h1>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
          <span className="font-mono">LIVE</span>
          {lastUpdated && (
            <>
              <span className="text-slate-700">|</span>
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-4 text-[10px] uppercase tracking-widest text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Optimal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Restricted
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Disrupted
          </span>
        </div>
        <StatusBadge status={systemStatus} label={statusLabel} pulse={systemStatus !== "optimal"} />
      </div>
    </header>
  );
}

function StatusBadge({ status, label, pulse }: { status: string; label: string; pulse?: boolean }) {
  const style =
    status === "disrupted"
      ? "bg-red-500/10 text-red-400 border-red-500/30"
      : status === "restricted"
        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border", style)}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-glow" />}
      {label}
    </span>
  );
}
