"use client";

import { PipelineSegment } from "@/lib/api";
import { Panel, StatusBadge } from "./ui";
import clsx from "clsx";

function pipelineStatus(s: PipelineSegment): "optimal" | "restricted" | "disrupted" {
  if (s.status === "SHUTDOWN") return "disrupted";
  if (s.status === "RESTRICTED" || s.utilizationRatePct >= 85) return "restricted";
  return "optimal";
}

export function PipelineMatrix({ segments }: { segments: PipelineSegment[] }) {
  return (
    <Panel title="Pipeline Segment Matrix" subtitle="Real-time status and utilization across network" noPadding>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/80 text-left text-[10px] uppercase tracking-widest text-slate-500 bg-surface/40">
              <th className="px-5 py-3 font-medium">Segment ID</th>
              <th className="px-5 py-3 font-medium">Route</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Flow (bbl/d)</th>
              <th className="px-5 py-3 font-medium text-right">Capacity</th>
              <th className="px-5 py-3 font-medium w-36">Utilization</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => {
              const st = pipelineStatus(s);
              return (
                <tr
                  key={s.code}
                  className="border-b border-slate-800/50 hover:bg-cyan-500/[0.03] transition-colors"
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-cyan-400/90">{s.code}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-slate-300 text-xs">{s.source}</span>
                    <span className="text-slate-600 mx-2">→</span>
                    <span className="text-slate-300 text-xs">{s.destination}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={s.status} pulse={s.status === "SHUTDOWN"} />
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums">
                    {s.currentFlowBblsPerDay.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-slate-500">
                    {s.maxDailyCapacityBbls.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                        <div
                          className={clsx(
                            "h-full rounded-full transition-all",
                            st === "disrupted"
                              ? "bg-red-500"
                              : st === "restricted"
                                ? "bg-amber-500"
                                : "bg-gradient-to-r from-cyan-500 to-emerald-400"
                          )}
                          style={{ width: `${s.utilizationRatePct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] tabular-nums w-8 text-right text-slate-400">
                        {s.utilizationRatePct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
