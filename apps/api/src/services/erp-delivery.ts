import {
  prisma,
  ErpSyncDirection,
  ErpSyncStatus,
  WebhookDeliveryStatus,
} from "@energy-logix/database";

type DeliveryTarget = {
  name: string;
  url: string | undefined;
};

function getTargets(): DeliveryTarget[] {
  return [
    { name: "COMMERCIAL_TRADING_DESK", url: process.env.TRADING_DESK_WEBHOOK_URL },
    { name: "SAP_ERP", url: process.env.ERP_WEBHOOK_URL },
  ].filter((t) => t.url && t.url.length > 0);
}

async function postPayload(
  url: string,
  payload: unknown,
  headers?: Record<string, string>
): Promise<{ ok: boolean; status: number; body: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Energy-Logix-Source": "energy-logix-mes",
      ...headers,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

/**
 * Deliver a webhook event to configured external endpoints and log ERP sync records.
 */
export async function deliverWebhookEvent(webhookEventId: string): Promise<void> {
  const event = await prisma.webhookEvent.findUnique({ where: { id: webhookEventId } });
  if (!event || event.deliveryStatus === WebhookDeliveryStatus.DELIVERED) return;

  const targets = getTargets();
  if (targets.length === 0) {
    // Demo mode: mark as delivered locally when no URL configured
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        deliveryStatus: WebhookDeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
        failureReason: null,
      },
    });
    await prisma.erpSyncRecord.create({
      data: {
        direction: ErpSyncDirection.OUTBOUND,
        syncType: "WEBHOOK_DELIVERY",
        destination: "LOCAL_DEMO_ACK",
        status: ErpSyncStatus.SUCCESS,
        payload: event.payload as object,
        webhookEventId: event.id,
        responseCode: 200,
        responseBody: JSON.stringify({ ack: true, mode: "demo_no_url" }),
        completedAt: new Date(),
      },
    });
    return;
  }

  let anySuccess = false;
  let lastError = "";

  for (const target of targets) {
    const syncRecord = await prisma.erpSyncRecord.create({
      data: {
        direction: ErpSyncDirection.OUTBOUND,
        syncType: "WEBHOOK_DELIVERY",
        destination: target.name,
        status: ErpSyncStatus.PENDING,
        payload: event.payload as object,
        webhookEventId: event.id,
      },
    });

    try {
      const result = await postPayload(target.url!, {
        ...(event.payload as object),
        _meta: { eventType: event.eventType, webhookEventId: event.id, destination: target.name },
      });

      await prisma.erpSyncRecord.update({
        where: { id: syncRecord.id },
        data: {
          status: result.ok ? ErpSyncStatus.SUCCESS : ErpSyncStatus.FAILED,
          responseCode: result.status,
          responseBody: result.body.slice(0, 2000),
          errorMessage: result.ok ? null : `HTTP ${result.status}`,
          completedAt: new Date(),
        },
      });

      if (result.ok) anySuccess = true;
      else lastError = `HTTP ${result.status}: ${result.body.slice(0, 200)}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delivery failed";
      lastError = msg;
      await prisma.erpSyncRecord.update({
        where: { id: syncRecord.id },
        data: {
          status: ErpSyncStatus.FAILED,
          errorMessage: msg,
          completedAt: new Date(),
        },
      });
    }
  }

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: {
      deliveryStatus: anySuccess ? WebhookDeliveryStatus.DELIVERED : WebhookDeliveryStatus.FAILED,
      deliveredAt: anySuccess ? new Date() : null,
      failureReason: anySuccess ? null : lastError,
    },
  });
}

export async function processPendingWebhooks(): Promise<number> {
  const pending = await prisma.webhookEvent.findMany({
    where: { deliveryStatus: WebhookDeliveryStatus.PENDING },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  for (const event of pending) {
    await deliverWebhookEvent(event.id);
  }
  return pending.length;
}

export async function syncInventoryToErp(): Promise<{ facilities: number; syncId: string }> {
  const facilities = await prisma.facility.findMany({
    where: { isActive: true },
    select: {
      code: true,
      name: true,
      bitumenBbls: true,
      diluentBbls: true,
      totalStorageCapacityBbls: true,
      facilityType: true,
    },
  });

  const payload = {
    event: "INVENTORY_SNAPSHOT",
    source: "energy-logix-mes",
    timestamp: new Date().toISOString(),
    facilities: facilities.map((f) => ({
      code: f.code,
      name: f.name,
      type: f.facilityType,
      bitumenBbls: Number(f.bitumenBbls),
      diluentBbls: Number(f.diluentBbls),
      totalStorageCapacityBbls: Number(f.totalStorageCapacityBbls),
      utilizationPct:
        Number(f.totalStorageCapacityBbls) > 0
          ? Math.round(
              ((Number(f.bitumenBbls) + Number(f.diluentBbls)) /
                Number(f.totalStorageCapacityBbls)) *
                100
            )
          : 0,
    })),
  };

  const syncRecord = await prisma.erpSyncRecord.create({
    data: {
      direction: ErpSyncDirection.OUTBOUND,
      syncType: "INVENTORY_SNAPSHOT",
      destination: process.env.ERP_WEBHOOK_URL ? "SAP_ERP" : "LOCAL_DEMO_ACK",
      status: ErpSyncStatus.PENDING,
      payload,
    },
  });

  const erpUrl = process.env.ERP_WEBHOOK_URL;
  if (erpUrl) {
    try {
      const result = await postPayload(erpUrl, payload, { "X-Sync-Type": "INVENTORY_SNAPSHOT" });
      await prisma.erpSyncRecord.update({
        where: { id: syncRecord.id },
        data: {
          status: result.ok ? ErpSyncStatus.SUCCESS : ErpSyncStatus.FAILED,
          responseCode: result.status,
          responseBody: result.body.slice(0, 2000),
          errorMessage: result.ok ? null : `HTTP ${result.status}`,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      await prisma.erpSyncRecord.update({
        where: { id: syncRecord.id },
        data: {
          status: ErpSyncStatus.FAILED,
          errorMessage: err instanceof Error ? err.message : "Sync failed",
          completedAt: new Date(),
        },
      });
    }
  } else {
    await prisma.erpSyncRecord.update({
      where: { id: syncRecord.id },
      data: {
        status: ErpSyncStatus.SUCCESS,
        responseCode: 200,
        responseBody: JSON.stringify({ ack: true, mode: "demo_no_url", facilityCount: facilities.length }),
        completedAt: new Date(),
      },
    });
  }

  return { facilities: facilities.length, syncId: syncRecord.id };
}

export function startErpDeliveryWorker(intervalMs = 30_000): NodeJS.Timeout {
  const tick = () => {
    processPendingWebhooks().catch((err) =>
      console.warn("[ERP] webhook delivery failed:", err instanceof Error ? err.message : err)
    );
  };
  tick();
  return setInterval(tick, intervalMs);
}
