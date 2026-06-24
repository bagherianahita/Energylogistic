"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, DashboardSummary, Notification, Topology } from "@/lib/api";
import { Sidebar, TopBar, NavSection } from "./layout/Shell";
import { KpiTile } from "./ui";
import { InventoryMeters } from "./InventoryMeters";
import { PipelineMatrix } from "./PipelineMatrix";
import { BlendScheduler } from "./BlendScheduler";
import { IncidentSimulator } from "./IncidentSimulator";
import { NotificationsPanel } from "./NotificationsPanel";
import { NetworkTopologyGraph } from "./NetworkTopology";
import {
  PipelineUtilizationChart,
  InventoryCompositionChart,
  ThroughputTrendChart,
  StorageDistributionChart,
  CapacityVsFlowChart,
} from "./charts/ChartsLazy";
import {
  Truck,
  AlertOctagon,
  Bell,
  Droplet,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

export function CommandCenter() {
  const [section, setSection] = useState<NavSection>("overview");
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [topology, setTopology] = useState<Topology | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [summary, notifs, topo] = await Promise.all([
        api.getDashboard(),
        api.getNotifications(),
        api.getTopology(),
      ]);
      setData(summary);
      setNotifications(notifs);
      setTopology(topo);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot reach API on port 4000");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 20000);
    return () => clearInterval(interval);
  }, [refresh]);

  const systemStatus = useMemo((): "optimal" | "restricted" | "disrupted" => {
    if (!data) return "optimal";
    if (data.kpis.openIncidents > 0) return "disrupted";
    if (data.kpis.inventoryWarnings > 0 || data.pipelineMatrix.some((p) => p.status === "RESTRICTED"))
      return "restricted";
    return "optimal";
  }, [data]);

  const totalThroughput = useMemo(
    () => data?.pipelineMatrix.reduce((s, p) => s + p.currentFlowBblsPerDay, 0) ?? 0,
    [data]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
        <p className="text-sm text-slate-500">Initializing MES platform…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-8 text-center">
        <AlertOctagon className="w-12 h-12 text-red-400/80" />
        <div>
          <h1 className="text-lg font-semibold text-slate-200">Platform Connection Error</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-md">{error}</p>
        </div>
        <div className="text-left text-xs font-mono text-slate-500 bg-panel border border-slate-800 rounded-xl p-5 space-y-1.5 max-w-md">
          <p className="text-slate-400 font-sans font-medium mb-2">Start the demo:</p>
          <p>npm run docker:up</p>
          <p>npm run db:migrate:deploy</p>
          <p>npm run db:seed</p>
          <p>npm run dev</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium hover:bg-cyan-500"
        >
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </button>
      </div>
    );
  }

  const { inventoryMeters, pipelineMatrix, kpis } = data;

  return (
    <div className="min-h-screen flex">
      <Sidebar active={section} onNavigate={setSection} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar lastUpdated={lastUpdated} systemStatus={systemStatus} />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5 animate-slide-up">
            {/* Mobile nav */}
            <div className="lg:hidden flex gap-1 overflow-x-auto pb-1">
              {(["overview", "network", "blending", "incidents"] as NavSection[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                    section === s
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      : "text-slate-500 border border-transparent"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-100 capitalize">
                  {section === "overview" && "Operations Overview"}
                  {section === "network" && "Pipeline Network"}
                  {section === "blending" && "Diluent Blending"}
                  {section === "incidents" && "Disruption Control"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lloydminster Thermal · Athabasca & Peace River assets
                </p>
              </div>
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-400 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {/* KPI row — always visible */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <KpiTile
                label="Network Throughput"
                value={(totalThroughput / 1000).toFixed(0) + "k"}
                unit="bbl/d"
                trend="Aggregate pipeline flow"
                status="optimal"
                icon={<TrendingUp className="w-4 h-4" />}
              />
              <KpiTile
                label="Active Shipments"
                value={kpis.activeShipments}
                unit="in transit"
                status="neutral"
                icon={<Truck className="w-4 h-4" />}
              />
              <KpiTile
                label="Open Incidents"
                value={kpis.openIncidents}
                status={kpis.openIncidents > 0 ? "disrupted" : "optimal"}
                icon={<AlertOctagon className="w-4 h-4" />}
              />
              <KpiTile
                label="Inventory Warnings"
                value={kpis.inventoryWarnings}
                status={kpis.inventoryWarnings > 0 ? "restricted" : "optimal"}
                icon={<Droplet className="w-4 h-4" />}
              />
              <KpiTile
                label="Unread Alerts"
                value={kpis.unreadNotifications}
                status={kpis.unreadNotifications > 0 ? "restricted" : "neutral"}
                icon={<Bell className="w-4 h-4" />}
              />
            </div>

            {section === "overview" && (
              <>
                <InventoryMeters meters={inventoryMeters} />
                <div className="grid lg:grid-cols-2 gap-4">
                  <ThroughputTrendChart segments={pipelineMatrix} />
                  <StorageDistributionChart meters={inventoryMeters} />
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                  <InventoryCompositionChart meters={inventoryMeters} />
                  <PipelineUtilizationChart segments={pipelineMatrix} />
                </div>
                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <NotificationsPanel items={notifications} />
                  </div>
                  <BlendScheduler onSuccess={refresh} />
                </div>
              </>
            )}

            {section === "network" && (
              <>
                <NetworkTopologyGraph topology={topology} segments={pipelineMatrix} />
                <PipelineMatrix segments={pipelineMatrix} />
                <div className="grid lg:grid-cols-2 gap-4">
                  <PipelineUtilizationChart segments={pipelineMatrix} />
                  <CapacityVsFlowChart segments={pipelineMatrix} />
                </div>
              </>
            )}

            {section === "blending" && (
              <div className="grid lg:grid-cols-2 gap-4">
                <BlendScheduler onSuccess={refresh} />
                <InventoryCompositionChart meters={inventoryMeters} />
                <div className="lg:col-span-2">
                  <InventoryMeters meters={inventoryMeters} />
                </div>
              </div>
            )}

            {section === "incidents" && (
              <div className="grid lg:grid-cols-2 gap-4">
                <IncidentSimulator pipelines={pipelineMatrix} onSuccess={refresh} />
                <NotificationsPanel items={notifications} />
                <div className="lg:col-span-2">
                  <PipelineMatrix segments={pipelineMatrix} />
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="h-8 border-t border-slate-800/80 bg-surface-elevated/60 flex items-center px-5 text-[10px] text-slate-600 font-mono shrink-0">
          <span>energy-Logix MES v1.0</span>
          <span className="mx-3 text-slate-800">|</span>
          <span>PostgreSQL · Mass Balance Enforced</span>
          <span className="mx-3 text-slate-800">|</span>
          <span className="text-cyan-600/60">LIVE DATA</span>
        </footer>
      </div>
    </div>
  );
}
