"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { Panel } from "../ui";
import type { InventoryMeter, PipelineSegment } from "@/lib/api";

const CHART_COLORS = {
  bitumen: "#f59e0b",
  diluent: "#06b6d4",
  flow: "#10b981",
  capacity: "#334155",
  grid: "#1e293b",
  text: "#94a3b8",
};

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "#e2e8f0" },
};

function formatK(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

export function PipelineUtilizationChart({ segments }: { segments: PipelineSegment[] }) {
  const data = segments
    .map((s) => ({
      name: s.code.replace("PL-", ""),
      utilization: s.utilizationRatePct,
      flow: s.currentFlowBblsPerDay,
      capacity: s.maxDailyCapacityBbls,
      status: s.status,
    }))
    .sort((a, b) => b.utilization - a.utilization);

  return (
    <Panel title="Pipeline Utilization" subtitle="Current flow vs. rated capacity (%)" className="h-full">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: CHART_COLORS.text, fontSize: 10 }} unit="%" />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fill: CHART_COLORS.text, fontSize: 10, fontFamily: "JetBrains Mono" }}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(value, name) => [
              name === "utilization"
                ? `${Number(value).toFixed(1)}%`
                : `${Number(value).toLocaleString()} bbl/d`,
              name === "utilization" ? "Utilization" : String(name),
            ]}
          />
          <Bar dataKey="utilization" radius={[0, 4, 4, 0]} barSize={14}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.status === "SHUTDOWN"
                    ? "#ef4444"
                    : entry.status === "RESTRICTED" || entry.utilization >= 85
                      ? "#f59e0b"
                      : "#06b6d4"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function InventoryCompositionChart({ meters }: { meters: InventoryMeter[] }) {
  const data = meters.map((m) => ({
    name: m.name.split(" ")[0],
    bitumen: m.bitumenBbls,
    diluent: m.diluentBbls,
    capacity: m.totalStorageCapacityBbls,
  }));

  return (
    <Panel title="Facility Inventory Composition" subtitle="Bitumen vs. diluent by asset (bbl)">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
          <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 10 }} tickFormatter={formatK} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toLocaleString()} bbl`, ""]} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="bitumen" stackId="a" fill={CHART_COLORS.bitumen} name="Bitumen" radius={[0, 0, 0, 0]} />
          <Bar dataKey="diluent" stackId="a" fill={CHART_COLORS.diluent} name="Diluent" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function ThroughputTrendChart({ segments }: { segments: PipelineSegment[] }) {
  const totalFlow = segments.reduce((s, p) => s + p.currentFlowBblsPerDay, 0);
  const hours = ["00", "04", "08", "12", "16", "20", "Now"];
  const data = hours.map((h, i) => {
    const variance = 0.92 + Math.sin(i * 1.2) * 0.06 + (i / hours.length) * 0.04;
    return {
      time: h,
      throughput: Math.round(totalFlow * variance),
      target: Math.round(totalFlow * 0.95),
    };
  });

  return (
    <Panel title="Network Throughput Trend" subtitle="Aggregate pipeline flow · last 24 hours (bbl/d)">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="time" tick={{ fill: CHART_COLORS.text, fontSize: 10 }} />
          <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 10 }} tickFormatter={formatK} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toLocaleString()} bbl/d`, ""]} />
          <Area
            type="monotone"
            dataKey="throughput"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="url(#flowGrad)"
            name="Throughput"
          />
          <Area
            type="monotone"
            dataKey="target"
            stroke="#334155"
            strokeWidth={1}
            strokeDasharray="4 4"
            fill="none"
            name="Target"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function StorageDistributionChart({ meters }: { meters: InventoryMeter[] }) {
  const data = meters.map((m) => ({
    name: m.name.split(" ")[0],
    value: m.storageUtilizationPct,
    fill:
      m.status === "disrupted"
        ? "#ef4444"
        : m.status === "restricted"
          ? "#f59e0b"
          : "#10b981",
  }));

  return (
    <Panel title="Storage Utilization" subtitle="Tank farm fill level by facility (%)">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} stroke="#111827" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${Number(v)}%`, "Utilization"]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function CapacityVsFlowChart({ segments }: { segments: PipelineSegment[] }) {
  const data = segments.slice(0, 6).map((s) => ({
    name: s.code.replace("PL-", ""),
    flow: s.currentFlowBblsPerDay,
    residual: s.maxDailyCapacityBbls - s.currentFlowBblsPerDay,
  }));

  return (
    <Panel title="Capacity Allocation" subtitle="Active flow vs. residual capacity (bbl/d)">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: CHART_COLORS.text, fontSize: 9 }} />
          <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 10 }} tickFormatter={formatK} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toLocaleString()} bbl/d`, ""]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="flow" stackId="s" fill="#06b6d4" name="Active Flow" />
          <Bar dataKey="residual" stackId="s" fill="#1e293b" name="Residual" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
