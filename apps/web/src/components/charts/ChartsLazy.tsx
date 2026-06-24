"use client";

import dynamic from "next/dynamic";

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="rounded-xl border border-slate-800/80 bg-panel/90 animate-pulse flex items-center justify-center"
      style={{ height }}
    >
      <span className="text-xs text-slate-600 uppercase tracking-widest">Loading chart…</span>
    </div>
  );
}

export const PipelineUtilizationChart = dynamic(
  () =>
    import("./AnalyticsCharts").then((m) => ({ default: m.PipelineUtilizationChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const InventoryCompositionChart = dynamic(
  () =>
    import("./AnalyticsCharts").then((m) => ({ default: m.InventoryCompositionChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const ThroughputTrendChart = dynamic(
  () =>
    import("./AnalyticsCharts").then((m) => ({ default: m.ThroughputTrendChart })),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);

export const StorageDistributionChart = dynamic(
  () =>
    import("./AnalyticsCharts").then((m) => ({ default: m.StorageDistributionChart })),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);

export const CapacityVsFlowChart = dynamic(
  () =>
    import("./AnalyticsCharts").then((m) => ({ default: m.CapacityVsFlowChart })),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> }
);
