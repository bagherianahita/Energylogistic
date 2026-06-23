"use client";

import { useCallback, useEffect, useState } from "react";
import { api, DashboardSummary, Notification } from "@/lib/api";
import { KpiCard } from "./ui";
import { InventoryMeters } from "./InventoryMeters";
import { PipelineMatrix } from "./PipelineMatrix";
import { BlendScheduler } from "./BlendScheduler";
import { IncidentSimulator } from "./IncidentSimulator";
import { NotificationsPanel } from "./NotificationsPanel";

export function CommandCenter() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [summary, notifs] = await Promise.all([
        api.getDashboard(),
        api.getNotifications(),
      ]);
      setData(summary);
      setNotifications(notifs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot reach API — is the server running on port 4000?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading command center…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold text-red-400">API Connection Failed</h1>
        <p className="text-slate-400 max-w-md">{error}</p>
        <div className="text-left text-sm text-slate-500 bg-panel border border-slate-700 rounded-lg p-4 max-w-lg space-y-1">
          <p className="font-medium text-slate-300">Start the demo locally:</p>
          <code className="block">npm run docker:up</code>
          <code className="block">npm run db:migrate:deploy</code>
          <code className="block">npm run db:seed</code>
          <code className="block">npm run dev</code>
        </div>
        <button onClick={refresh} className="rounded bg-green-600 px-4 py-2 text-sm hover:bg-green-500">
          Retry
        </button>
      </div>
    );
  }

  const { inventoryMeters, pipelineMatrix, kpis } = data;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-panel/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Commercial Operations</p>
            <h1 className="text-xl font-bold tracking-tight">
              energy-Logix <span className="text-slate-500 font-normal text-base">Command Center</span>
            </h1>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Optimal</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Restricted</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Disrupted</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Active Shipments" value={kpis.activeShipments} />
          <KpiCard label="Open Incidents" value={kpis.openIncidents} accent={kpis.openIncidents > 0 ? "disrupted" : undefined} />
          <KpiCard label="Unread Alerts" value={kpis.unreadNotifications} accent={kpis.unreadNotifications > 0 ? "restricted" : undefined} />
          <KpiCard label="Inventory Warnings" value={kpis.inventoryWarnings} accent={kpis.inventoryWarnings > 0 ? "restricted" : undefined} />
        </div>

        <InventoryMeters meters={inventoryMeters} />
        <PipelineMatrix segments={pipelineMatrix} />

        <div className="grid lg:grid-cols-3 gap-4">
          <BlendScheduler onSuccess={refresh} />
          <IncidentSimulator pipelines={pipelineMatrix} onSuccess={refresh} />
          <NotificationsPanel items={notifications} />
        </div>
      </main>
    </div>
  );
}
