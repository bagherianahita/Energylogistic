"use client";

import { useEffect, useState } from "react";
import { api, ScadaLiveData } from "@/lib/api";
import { Panel } from "./ui";
import { Radio, Activity } from "lucide-react";

function Sparkline({ values, quality }: { values: number[]; quality?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  const stroke =
    quality === "BAD" ? "#f87171" : quality === "UNCERTAIN" ? "#fbbf24" : "#22d3ee";

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} />
    </svg>
  );
}

export function ScadaLivePanel() {
  const [data, setData] = useState<ScadaLiveData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      api
        .getScadaLive()
        .then(setData)
        .catch((e) => setError(e instanceof Error ? e.message : "SCADA unavailable"));
    };
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Panel
      title="Live SCADA Telemetry"
      subtitle="OPC-UA simulator · 15s cycle · pipeline flow & inventory tags"
      action={
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      }
    >
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!data && !error && <p className="text-xs text-slate-500">Connecting to SCADA gateway…</p>}
      {data && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 font-mono">
            {data.tagCount} tags · last update{" "}
            {data.lastCycleAt ? new Date(data.lastCycleAt).toLocaleTimeString() : "—"}
          </p>
          <div className="divide-y divide-slate-800/80">
            {data.tags.map((tag) => (
              <div key={tag.tagCode} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  {tag.assetType === "PIPELINE" ? (
                    <Activity className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Radio className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{tag.tagName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{tag.tagCode}</p>
                </div>
                <Sparkline values={tag.sparkline} quality={tag.latest?.quality} />
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-semibold text-slate-100">
                    {tag.latest ? tag.latest.value.toLocaleString("en-CA", { maximumFractionDigits: 0 }) : "—"}
                  </p>
                  <p className="text-[10px] text-slate-500">{tag.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
