"use client";

import { Notification } from "@/lib/api";
import { StatusBadge } from "./ui";

export function NotificationsPanel({ items }: { items: Notification[] }) {
  return (
    <section className="rounded-lg border border-slate-700/80 bg-panel p-4 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
        Alerts &amp; Notifications
      </h2>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {items.length === 0 && (
          <li className="text-sm text-slate-500">No notifications</li>
        )}
        {items.map((n) => (
          <li
            key={n.id}
            className="rounded border border-slate-800 bg-slate-900/50 p-3 space-y-1"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{n.title}</span>
              <StatusBadge status={n.severity} label={n.severity.replace("_", " ")} />
            </div>
            <p className="text-xs text-slate-400">{n.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
