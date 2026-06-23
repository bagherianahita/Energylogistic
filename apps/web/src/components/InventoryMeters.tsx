"use client";

import { InventoryMeter, formatBbls } from "@/lib/api";
import { Panel, ProgressBar, StatusBadge } from "./ui";

export function InventoryMeters({ meters }: { meters: InventoryMeter[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {meters.map((m) => (
        <Panel key={m.code} noPadding className="overflow-hidden">
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">{m.name}</h3>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">{m.code}</p>
              </div>
              <StatusBadge status={m.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-surface/60 border border-slate-800/60 p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-amber-500/80">Bitumen</p>
                <p className="font-mono text-sm font-medium tabular-nums mt-0.5">
                  {(m.bitumenBbls / 1000).toFixed(0)}k
                </p>
                <p className="text-[9px] text-slate-600">bbl</p>
              </div>
              <div className="rounded-lg bg-surface/60 border border-slate-800/60 p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-cyan-500/80">Diluent</p>
                <p className="font-mono text-sm font-medium tabular-nums mt-0.5">
                  {(m.diluentBbls / 1000).toFixed(0)}k
                </p>
                <p className="text-[9px] text-slate-600">bbl</p>
              </div>
            </div>

            <ProgressBar
              value={m.bitumenBbls + m.diluentBbls}
              max={m.totalStorageCapacityBbls}
              status={m.status as "optimal" | "restricted" | "disrupted"}
            />
            <p className="text-[10px] text-slate-500 font-mono">
              Cap {formatBbls(m.totalStorageCapacityBbls)}
            </p>
          </div>
        </Panel>
      ))}
    </div>
  );
}
