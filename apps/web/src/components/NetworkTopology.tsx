"use client";

import { useMemo } from "react";
import { Panel, StatusBadge } from "./ui";
import type { Topology } from "@/lib/api";

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  FOSTER_CREEK: { x: 80, y: 80 },
  CHRISTINA_LAKE: { x: 80, y: 180 },
  SUNRISE: { x: 80, y: 280 },
  LLOYD_HUB: { x: 320, y: 180 },
  LLOYD_UPGRADER: { x: 520, y: 100 },
  HARDISTY_TERMINAL: { x: 520, y: 260 },
  REFINERY_EAST: { x: 680, y: 260 },
};

const TYPE_COLORS: Record<string, string> = {
  PRODUCTION_ASSET: "#06b6d4",
  MIDSTREAM_HUB: "#8b5cf6",
  UPGRADER: "#f59e0b",
  TERMINAL: "#10b981",
  REFINERY: "#64748b",
};

function edgeColor(status: string) {
  if (status === "SHUTDOWN") return "#ef4444";
  if (status === "RESTRICTED") return "#f59e0b";
  return "#06b6d4";
}

export function NetworkTopologyGraph({
  topology,
  segments,
}: {
  topology: Topology | null;
  segments: { code: string; status: string; utilizationRatePct: number }[];
}) {
  const utilMap = useMemo(
    () => Object.fromEntries(segments.map((s) => [s.code, s.utilizationRatePct])),
    [segments]
  );

  if (!topology) {
    return (
      <Panel title="Asset Topology Graph" subtitle="Loading network model…">
        <div className="h-80 flex items-center justify-center text-slate-500 text-sm">Loading…</div>
      </Panel>
    );
  }

  const nodeById = Object.fromEntries(topology.nodes.map((n) => [n.id, n]));

  return (
    <Panel
      title="Asset Topology Graph"
      subtitle="Production assets → midstream hub → downstream destinations"
      noPadding
    >
      <div className="relative overflow-x-auto">
        <svg viewBox="0 0 780 380" className="w-full min-w-[640px] h-auto" style={{ minHeight: 320 }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#475569" />
            </marker>
          </defs>

          {/* Edges */}
          {topology.edges.map((edge) => {
            const src = nodeById[edge.source];
            const tgt = nodeById[edge.target];
            if (!src || !tgt) return null;
            const sp = NODE_POSITIONS[src.code] ?? { x: 100, y: 100 };
            const tp = NODE_POSITIONS[tgt.code] ?? { x: 400, y: 200 };
            const color = edgeColor(edge.status);
            const util = utilMap[edge.code] ?? 0;
            const midX = (sp.x + tp.x) / 2;
            const midY = (sp.y + tp.y) / 2;

            return (
              <g key={edge.id}>
                <line
                  x1={sp.x + 40}
                  y1={sp.y}
                  x2={tp.x - 40}
                  y2={tp.y}
                  stroke={color}
                  strokeWidth={Math.max(2, util / 25)}
                  strokeOpacity={edge.status === "SHUTDOWN" ? 0.4 : 0.85}
                  strokeDasharray={edge.status === "SHUTDOWN" ? "6 4" : undefined}
                  markerEnd="url(#arrow)"
                />
                <text
                  x={midX}
                  y={midY - 6}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                >
                  {edge.code.replace("PL-", "")}
                </text>
                <text
                  x={midX}
                  y={midY + 8}
                  textAnchor="middle"
                  fill={color}
                  fontSize="8"
                  fontFamily="JetBrains Mono"
                >
                  {util.toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {topology.nodes.map((node) => {
            const pos = NODE_POSITIONS[node.code];
            if (!pos) return null;
            const fill = TYPE_COLORS[node.type] ?? "#64748b";

            return (
              <g key={node.id} filter="url(#glow)">
                <rect
                  x={pos.x - 40}
                  y={pos.y - 22}
                  width={80}
                  height={44}
                  rx={8}
                  fill="#111827"
                  stroke={fill}
                  strokeWidth={1.5}
                />
                <text
                  x={pos.x}
                  y={pos.y - 4}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="9"
                  fontWeight="600"
                >
                  {node.name.length > 14 ? node.name.slice(0, 12) + "…" : node.name}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 10}
                  textAnchor="middle"
                  fill={fill}
                  fontSize="7"
                  fontFamily="JetBrains Mono"
                >
                  {node.type.replace(/_/g, " ")}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="absolute top-4 right-4 flex flex-col gap-1.5 text-[10px]">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
              {type.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      <div className="px-5 pb-4 flex flex-wrap gap-2 border-t border-slate-800/80 pt-3">
        {segments.map((s) => (
          <span key={s.code} className="flex items-center gap-2 text-xs text-slate-400">
            <StatusBadge status={s.status} />
            <span className="font-mono text-[10px]">{s.code}</span>
          </span>
        ))}
      </div>
    </Panel>
  );
}
