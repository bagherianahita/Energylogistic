"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Panel } from "./ui";
import { Calculator } from "lucide-react";

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
  const totalBlend = bitumenVolume + requiredDiluent;

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
      const batch = res as {
        batch: { batchNumber: string };
        approvalRequired?: boolean;
        validation: { inventoryDepletionWarning: boolean };
      };
      setResult(
        batch.approvalRequired
          ? `Batch ${batch.batch.batchNumber} submitted — awaiting approval`
          : batch.validation.inventoryDepletionWarning
            ? `Batch ${batch.batch.batchNumber} — INVENTORY DEPLETION WARNING`
            : `Batch ${batch.batch.batchNumber} scheduled`
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule blend");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel
      title="Blend Batch Scheduler"
      subtitle="Heavy bitumen diluent ratio validator"
      action={<Calculator className="w-4 h-4 text-cyan-500/60" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1.5">Facility</label>
            <select
              value={facilityCode}
              onChange={(e) => setFacilityCode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2.5 text-sm focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            >
              {FACILITIES.map((f) => (
                <option key={f.code} value={f.code}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1.5">Bitumen (bbl)</label>
            <input
              type="number"
              value={bitumenVolume}
              onChange={(e) => setBitumenVolume(Number(e.target.value))}
              min={1000}
              step={1000}
              className="w-full rounded-lg border border-slate-700 bg-surface px-3 py-2.5 text-sm font-mono focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Target Diluent Ratio</label>
            <span className="text-sm font-mono text-cyan-400">{(targetRatio * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={0.3}
            step={0.01}
            value={targetRatio}
            onChange={(e) => setTargetRatio(Number(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>20%</span>
            <span>30%</span>
          </div>
        </div>

        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2 font-mono text-xs">
          <p className="text-slate-500">Required Diluent = (Ratio × Bitumen) / (1 − Ratio)</p>
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div>
              <p className="text-slate-600 text-[10px]">Diluent Req.</p>
              <p className="text-amber-400 text-sm">{requiredDiluent.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div>
              <p className="text-slate-600 text-[10px]">Total Blend</p>
              <p className="text-cyan-400 text-sm">{totalBlend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div>
              <p className="text-slate-600 text-[10px]">Viscosity</p>
              <p className="text-emerald-400 text-sm">Pipeline OK</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold transition-all shadow-glow"
        >
          {loading ? "Validating & Scheduling…" : "Schedule Blend Batch"}
        </button>
      </form>
      {result && <p className="text-sm text-emerald-400 mt-3 font-medium">{result}</p>}
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </Panel>
  );
}
