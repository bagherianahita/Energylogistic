"use client";

import { useState } from "react";
import { api, PipelineSegment } from "@/lib/api";
import { Panel } from "./ui";
import { Zap } from "lucide-react";

export function IncidentSimulator({
  pipelines,
  onSuccess,
}: {
  pipelines: PipelineSegment[];
  onSuccess: () => void;
}) {
  const [pipelineCode, setPipelineCode] = useState(pipelines[0]?.code ?? "");
  const [duration, setDuration] = useState(7);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSimulate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.simulateIncident({
        pipelineCode,
        estimatedDurationDays: duration,
      });
      setResult(res as Record<string, unknown>);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  const activePipelines = pipelines.filter((p) => p.status !== "SHUTDOWN");

  return (
    <Panel
      title="Disruption Simulator"
      subtitle="Unplanned outage · reroute & storage diversion engine"
      action={<Zap className="w-4 h-4 text-red-400/70" />}
      className="border-red-500/10"
    >
      <div className="space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1.5">Pipeline Segment</label>
          <select
            value={pipelineCode}
            onChange={(e) => setPipelineCode(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2.5 text-sm focus:border-red-500/40 focus:outline-none"
          >
            {activePipelines.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} — {p.source} → {p.destination}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Shutdown Duration</label>
            <span className="text-sm font-mono text-red-400">{duration} days</span>
          </div>
          <input
            type="range"
            min={1}
            max={14}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-red-500"
          />
        </div>

        <button
          type="button"
          onClick={handleSimulate}
          disabled={loading || !pipelineCode}
          className="w-full rounded-lg bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold transition-all"
        >
          {loading ? "Running Simulation…" : "Simulate Pipeline Shutdown"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

      {result && (
        <div className="mt-4 rounded-lg bg-surface border border-slate-800 p-3">
          <p className="text-[10px] uppercase tracking-widest text-red-400 mb-2">Trading Desk Webhook Payload</p>
          <pre className="text-[10px] text-slate-400 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto leading-relaxed">
            {JSON.stringify(result.webhookPayload ?? result, null, 2)}
          </pre>
        </div>
      )}
    </Panel>
  );
}
