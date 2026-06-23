"use client";

import { Notification } from "@/lib/api";
import { Panel, StatusBadge } from "./ui";
import { Bell } from "lucide-react";

export function NotificationsPanel({ items }: { items: Notification[] }) {
  return (
    <Panel
      title="Alert Console"
      subtitle="Commercial operations notifications"
      action={
        items.length > 0 ? (
          <span className="flex items-center gap-1.5 text-xs text-amber-400">
            <Bell className="w-3.5 h-3.5" />
            {items.filter((n) => !n.isRead).length} unread
          </span>
        ) : null
      }
    >
      <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {items.length === 0 && (
          <li className="text-sm text-slate-500 py-8 text-center">No active alerts</li>
        )}
        {items.map((n) => (
          <li
            key={n.id}
            className="rounded-lg border border-slate-800/80 bg-surface/60 p-3 space-y-1.5 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-200">{n.title}</span>
              <StatusBadge status={n.severity} label={n.severity.replace("_", " ")} />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">{n.message}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
