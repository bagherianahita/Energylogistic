"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ErpSyncStatus } from "@/lib/api";
import { Panel } from "./ui";
import { CloudUpload, RefreshCw, Link2 } from "lucide-react";

export function ErpConnectivityPanel() {
  const [status, setStatus] = useState<ErpSyncStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    api.getErpStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20_000);
    return () => clearInterval(interval);
  }, [load]);

  async function syncInventory() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.syncInventoryToErp();
      setMessage(`Inventory snapshot synced (${res.facilities} facilities)`);
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function deliverPending() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.deliverPendingWebhooks();
      setMessage(`Processed ${res.processed} pending webhook(s)`);
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Delivery failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="ERP & Trading Desk Connectivity"
      subtitle="SAP ERP outbound sync · Commercial Trading Desk webhooks"
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <span
          className={`text-[10px] px-2 py-1 rounded border ${
            status?.tradingDeskUrl
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-slate-800 text-slate-500 border-slate-700"
          }`}
        >
          Trading Desk: {status?.tradingDeskUrl ? "URL configured" : "Demo mode"}
        </span>
        <span
          className={`text-[10px] px-2 py-1 rounded border ${
            status?.erpUrl
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-slate-800 text-slate-500 border-slate-700"
          }`}
        >
          ERP: {status?.erpUrl ? "URL configured" : "Demo mode"}
        </span>
        {status && (
          <span className="text-[10px] px-2 py-1 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">
            Pending webhooks: {status.pendingWebhooks}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void syncInventory()}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 disabled:opacity-50"
        >
          <CloudUpload className="w-3.5 h-3.5" /> Push Inventory to ERP
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void deliverPending()}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} /> Deliver Pending Webhooks
        </button>
      </div>

      {message && <p className="text-xs text-cyan-400/90 mb-3">{message}</p>}

      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
        <Link2 className="w-3 h-3" /> Recent sync log
      </p>
      <ul className="space-y-1.5 max-h-48 overflow-y-auto">
        {(status?.recent ?? []).map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between text-[10px] font-mono py-1.5 border-b border-slate-800/50"
          >
            <span className="text-slate-400">
              {r.syncType} → {r.destination}
            </span>
            <span
              className={
                r.status === "SUCCESS"
                  ? "text-emerald-400"
                  : r.status === "FAILED"
                    ? "text-red-400"
                    : "text-amber-400"
              }
            >
              {r.status}
              {r.responseCode ? ` (${r.responseCode})` : ""}
            </span>
          </li>
        ))}
        {(!status?.recent || status.recent.length === 0) && (
          <li className="text-[10px] text-slate-600">No sync records yet — simulate an incident or push inventory</li>
        )}
      </ul>
    </Panel>
  );
}
