"use client";

import { useState } from "react";
import { api } from "@/lib/api";

const FACILITIES = [
  { code: "FOSTER_CREEK", name: "Foster Creek" },
  { code: "CHRISTINA_LAKE", name: "Christina Lake" },
  { code: "SUNRISE", name: "Sunrise" },
  { code: "LLOYD_UPGRADER", name: "Lloydminster Upgrader" },
];

export function BlendScheduler({ onSuccess }: { onSuccess: () => void }) {
  const [facilityCode, setFacilityCode] = useState("FOSTER_CREEK");
  const [bitumenVolume, setBitumenVolume] = useState(25000);
  const [targetRatio, setTargetRatio] = useState(0.28);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requiredDiluent = (targetRatio * bitumenVolume) / (1 - targetRatio);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.scheduleBlend({
        facilityCode,
        bitumenVolumeBbls: bitumenVolume,
        targetRatio,
      });
      const batch = res as { batch: { batchNumber: string }; validation: { inventoryDepletionWarning: boolean } };
      setResult(
        batch.validation.inventoryDepletionWarning
          ? `Batch ${batch.batch.batchNumber} scheduled — INVENTORY DEPLETION WARNING`
          : `Batch ${batch.batch.batchNumber} scheduled successfully`
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule blend");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-700/80 bg-panel p-4 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
        Diluent Blend Scheduler
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Facility</label>
          <select
            value={facilityCode}
            onChange={(e) => setFacilityCode(e.target.value)}
            className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          >
            {FACILITIES.map((f) => (
              <option key={f.code} value={f.code}>{f.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Bitumen Volume (bbl)</label>
          <input
            type="number"
            value={bitumenVolume}
            onChange={(e) => setBitumenVolume(Number(e.target.value))}
            min={1000}
            step={1000}
            className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            Target Diluent Ratio: {(targetRatio * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min={0.2}
            max={0.3}
            step={0.01}
            value={targetRatio}
            onChange={(e) => setTargetRatio(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="rounded bg-slate-900/80 border border-slate-700 p-3 text-sm space-y-1">
          <p className="text-slate-500 text-xs">Formula: Required Diluent = (Ratio × Bitumen) / (1 − Ratio)</p>
          <p>
            Required diluent:{" "}
            <span className="font-mono text-orange-400">{requiredDiluent.toLocaleString(undefined, { maximumFractionDigits: 0 })} bbl</span>
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-green-600 hover:bg-green-500 disabled:opacity-50 px-4 py-2 text-sm font-medium transition-colors"
        >
          {loading ? "Scheduling…" : "Schedule Blend Batch"}
        </button>
      </form>
      {result && <p className="text-sm text-green-400">{result}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
