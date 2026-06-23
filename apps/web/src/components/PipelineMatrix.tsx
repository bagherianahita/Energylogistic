"use client";

import { PipelineSegment } from "@/lib/api";
import { StatusBadge } from "./ui";
import clsx from "clsx";

function pipelineStatus(s: PipelineSegment): "optimal" | "restricted" | "disrupted" {
  if (s.status === "SHUTDOWN") return "disrupted";
  if (s.status === "RESTRICTED" || s.utilizationRatePct >= 85) return "restricted";
  return "optimal";
}

export function PipelineMatrix({ segments }: { segments: PipelineSegment[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
        Pipeline Matrix
      </h2>
      <div className="rounded-lg border border-slate-700/80 bg-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Segment</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Flow (bbl/d)</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Utilization</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => {
              const st = pipelineStatus(s);
              return (
                <tr key={s.code} className="border-b border-slate-800/80 hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-3">
                    <span className="text-slate-300">{s.source}</span>
                    <span className="text-slate-600 mx-1">→</span>
                    <span className="text-slate-300">{s.destination}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {s.currentFlowBblsPerDay.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-400">
                    {s.maxDailyCapacityBbls.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-800 max-w-[80px]">
                        <div
                          className={clsx(
                            "h-full rounded-full",
                            st === "disrupted" ? "bg-red-500" : st === "restricted" ? "bg-orange-500" : "bg-green-500"
                          )}
                          style={{ width: `${s.utilizationRatePct}%` }}
                        />
                      </div>
                      <span className="font-mono tabular-nums text-xs w-10">{s.utilizationRatePct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
