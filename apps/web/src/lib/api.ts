const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type DashboardSummary = {
  inventoryMeters: InventoryMeter[];
  pipelineMatrix: PipelineSegment[];
  kpis: {
    activeShipments: number;
    openIncidents: number;
    unreadNotifications: number;
    inventoryWarnings: number;
  };
};

export type InventoryMeter = {
  code: string;
  name: string;
  bitumenBbls: number;
  diluentBbls: number;
  totalStorageCapacityBbls: number;
  storageUtilizationPct: number;
  status: "optimal" | "restricted" | "disrupted";
};

export type PipelineSegment = {
  code: string;
  name: string;
  source: string;
  destination: string;
  status: "ACTIVE" | "RESTRICTED" | "SHUTDOWN";
  utilizationRatePct: number;
  maxDailyCapacityBbls: number;
  currentFlowBblsPerDay: number;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "HIGH_PRIORITY" | "CRITICAL";
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error ${res.status}`);
  }
  return res.json();
}

export type Topology = {
  nodes: { id: string; code: string; name: string; type: string }[];
  edges: { id: string; code: string; source: string; target: string; status: string; maxDailyCapacityBbls: number }[];
  adjacency: { primary: string; alternate: string; additionalDelayDays: number; priority: number }[];
};

export const api = {
  getDashboard: () => apiFetch<DashboardSummary>("/api/dashboard/summary"),
  getTopology: () => apiFetch<Topology>("/api/pipelines/topology"),
  getNotifications: () => apiFetch<Notification[]>("/api/dashboard/notifications"),
  scheduleBlend: (body: {
    facilityCode: string;
    bitumenVolumeBbls: number;
    targetRatio: number;
  }) => apiFetch("/api/blends/schedule", { method: "POST", body: JSON.stringify(body) }),
  simulateIncident: (body: { pipelineCode: string; estimatedDurationDays?: number }) =>
    apiFetch("/api/incidents/simulate", { method: "POST", body: JSON.stringify(body) }),
  resolveIncident: (incidentNumber: string) =>
    apiFetch(`/api/incidents/${incidentNumber}/resolve`, { method: "PATCH" }),
  getIncidents: () => apiFetch<unknown[]>("/api/incidents"),
};

export function formatBbls(n: number): string {
  return n.toLocaleString("en-CA") + " bbl";
}

export function statusColor(status: string): string {
  if (status === "SHUTDOWN" || status === "disrupted" || status === "CRITICAL") return "disrupted";
  if (status === "RESTRICTED" || status === "restricted" || status === "WARNING" || status === "HIGH_PRIORITY") return "restricted";
  return "optimal";
}
