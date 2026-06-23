"use client";

import { InventoryMeter, formatBbls } from "@/lib/api";
import { ProgressBar, StatusBadge } from "./ui";

export function InventoryMeters({ meters }: { meters: InventoryMeter[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
        Facility Inventory
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {meters.map((m) => (
          <article
            key={m.code}
            className="rounded-lg border border-slate-700/80 bg-panel p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium">{m.name}</h3>
                <p className="text-xs text-slate-500">{m.code}</p>
              </div>
              <StatusBadge status={m.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-slate-500">Bitumen</p>
                <p className="font-mono tabular-nums">{formatBbls(m.bitumenBbls)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Diluent</p>
                <p className="font-mono tabular-nums">{formatBbls(m.diluentBbls)}</p>
              </div>
            </div>

            <ProgressBar
              value={m.bitumenBbls + m.diluentBbls}
              max={m.totalStorageCapacityBbls}
              status={m.status as "optimal" | "restricted" | "disrupted"}
            />
            <p className="text-xs text-slate-500">
              Capacity: {formatBbls(m.totalStorageCapacityBbls)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
