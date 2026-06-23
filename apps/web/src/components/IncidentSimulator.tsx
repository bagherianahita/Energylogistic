"use client";

import { useState } from "react";
import { api, PipelineSegment } from "@/lib/api";

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
    <section className="rounded-lg border border-red-500/20 bg-panel p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Simulate Pipeline Incident
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Marks segment non-operational and generates reroute / storage diversion options
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Pipeline Segment</label>
          <select
            value={pipelineCode}
            onChange={(e) => setPipelineCode(e.target.value)}
            className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          >
            {activePipelines.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} — {p.source} → {p.destination}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            Estimated Shutdown (days): {duration}
          </label>
          <input
            type="range"
            min={1}
            max={14}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <button
          type="button"
          onClick={handleSimulate}
          disabled={loading || !pipelineCode}
          className="w-full rounded bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-2 text-sm font-medium transition-colors"
        >
          {loading ? "Simulating…" : "Simulate 7-Day Shutdown"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="rounded bg-slate-900/80 border border-slate-700 p-3 text-xs space-y-2 max-h-48 overflow-y-auto">
          <p className="text-red-400 font-medium">Trading Desk Webhook Payload Generated</p>
          <pre className="text-slate-400 whitespace-pre-wrap font-mono">
            {JSON.stringify(result.webhookPayload ?? result, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
