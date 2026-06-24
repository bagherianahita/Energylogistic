"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApprovalRequest } from "@/lib/api";
import { Panel } from "./ui";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

const ROLES = [
  { value: "Commercial Scheduler", role: "COMMERCIAL_SCHEDULER" },
  { value: "Trading Desk", role: "TRADING_DESK" },
  { value: "Operations Manager", role: "OPERATIONS_MANAGER" },
];

export function ApprovalsPanel({ onSuccess }: { onSuccess?: () => void }) {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [reviewer, setReviewer] = useState("Commercial Scheduler");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .getApprovals("PENDING")
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load approvals"));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleApprove(requestNumber: string) {
    setBusy(requestNumber);
    try {
      await api.approveRequest(requestNumber, reviewer);
      load();
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(requestNumber: string) {
    setBusy(requestNumber);
    try {
      await api.rejectRequest(requestNumber, reviewer, "Rejected from command center");
      load();
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel
      title="Approval Workflows"
      subtitle="Blend batches & incident reroutes require role-based sign-off"
      action={
        <select
          className="text-[10px] bg-surface border border-slate-700 rounded px-2 py-1 text-slate-300"
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
        >
          {ROLES.map((r) => (
            <option key={r.role} value={r.value}>
              {r.value}
            </option>
          ))}
        </select>
      }
    >
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      {requests.length === 0 && (
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500/60" />
          No pending approvals
        </p>
      )}
      <ul className="space-y-3">
        {requests.map((req) => (
          <li key={req.id} className="rounded-lg border border-slate-800 bg-surface/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-200">{req.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{req.description}</p>
                <p className="text-[10px] text-amber-400/80 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Requires: {req.requiredRole.replace(/_/g, " ")}
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-600 shrink-0">{req.requestNumber}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                disabled={busy === req.requestNumber}
                onClick={() => void handleApprove(req.requestNumber)}
                className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3 h-3" /> Approve
              </button>
              <button
                type="button"
                disabled={busy === req.requestNumber}
                onClick={() => void handleReject(req.requestNumber)}
                className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600/20 disabled:opacity-50"
              >
                <XCircle className="w-3 h-3" /> Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
