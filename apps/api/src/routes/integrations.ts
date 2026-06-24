import { Router } from "express";
import { z } from "zod";
import {
  prisma,
  ErpSyncDirection,
  ErpSyncStatus,
  ApprovalStatus,
  BlendBatchStatus,
  NotificationSeverity,
} from "@energy-logix/database";
import { syncInventoryToErp, processPendingWebhooks, deliverWebhookEvent } from "../services/erp-delivery.js";
import { AppError } from "../middleware/error-handler.js";

export const approvalsRouter = Router();

approvalsRouter.get("/", async (req, res, next) => {
  try {
    const status = (req.query.status as string) || "PENDING";
    const requests = await prisma.approvalRequest.findMany({
      where: status === "ALL" ? {} : { status: status as ApprovalStatus },
      include: {
        blendBatch: { include: { facility: { select: { code: true, name: true } } } },
      },
      orderBy: { requestedAt: "desc" },
      take: 50,
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

const reviewSchema = z.object({
  reviewedBy: z.string().min(1),
  reviewNotes: z.string().optional(),
});

approvalsRouter.post("/:requestNumber/approve", async (req, res, next) => {
  try {
    const input = reviewSchema.parse(req.body);
    const request = await prisma.approvalRequest.findUnique({
      where: { requestNumber: req.params.requestNumber },
      include: { blendBatch: true },
    });
    if (!request) throw new AppError(404, "Approval request not found");
    if (request.status !== ApprovalStatus.PENDING) {
      throw new AppError(409, `Request already ${request.status.toLowerCase()}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const approval = await tx.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: ApprovalStatus.APPROVED,
          reviewedBy: input.reviewedBy,
          reviewNotes: input.reviewNotes,
          reviewedAt: new Date(),
        },
      });

      if (request.entityType === "BLEND_BATCH" && request.blendBatch) {
        const batch = request.blendBatch;
        const newStatus = batch.inventoryWarning
          ? BlendBatchStatus.INVENTORY_WARNING
          : BlendBatchStatus.SCHEDULED;

        await tx.blendBatch.update({
          where: { id: batch.id },
          data: { status: newStatus },
        });

        await tx.notification.create({
          data: {
            title: "Blend Batch Approved",
            message: `Batch ${batch.batchNumber} approved by ${input.reviewedBy} and is now ${newStatus.replace("_", " ").toLowerCase()}.`,
            severity: batch.inventoryWarning ? NotificationSeverity.HIGH_PRIORITY : NotificationSeverity.INFO,
            metadata: { batchNumber: batch.batchNumber, approvedBy: input.reviewedBy },
          },
        });
      }

      return approval;
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

approvalsRouter.post("/:requestNumber/reject", async (req, res, next) => {
  try {
    const input = reviewSchema.parse(req.body);
    const request = await prisma.approvalRequest.findUnique({
      where: { requestNumber: req.params.requestNumber },
      include: { blendBatch: true },
    });
    if (!request) throw new AppError(404, "Approval request not found");
    if (request.status !== ApprovalStatus.PENDING) {
      throw new AppError(409, `Request already ${request.status.toLowerCase()}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const approval = await tx.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: ApprovalStatus.REJECTED,
          reviewedBy: input.reviewedBy,
          reviewNotes: input.reviewNotes,
          reviewedAt: new Date(),
        },
      });

      if (request.blendBatch) {
        await tx.blendBatch.update({
          where: { id: request.blendBatch.id },
          data: { status: BlendBatchStatus.FAILED, notes: `Rejected: ${input.reviewNotes ?? "No reason given"}` },
        });
      }

      await tx.notification.create({
        data: {
          title: "Approval Rejected",
          message: `${request.title} was rejected by ${input.reviewedBy}.`,
          severity: NotificationSeverity.WARNING,
          metadata: { requestNumber: request.requestNumber },
        },
      });

      return approval;
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export const erpRouter = Router();

erpRouter.get("/sync/status", async (_req, res, next) => {
  try {
    const [recent, pendingWebhooks, pendingSyncs] = await Promise.all([
      prisma.erpSyncRecord.findMany({ orderBy: { attemptedAt: "desc" }, take: 20 }),
      prisma.webhookEvent.count({ where: { deliveryStatus: "PENDING" } }),
      prisma.erpSyncRecord.count({ where: { status: "PENDING" } }),
    ]);

    res.json({
      tradingDeskUrl: Boolean(process.env.TRADING_DESK_WEBHOOK_URL),
      erpUrl: Boolean(process.env.ERP_WEBHOOK_URL),
      pendingWebhooks,
      pendingSyncs,
      recent: recent.map((r) => ({
        id: r.id,
        direction: r.direction,
        syncType: r.syncType,
        destination: r.destination,
        status: r.status,
        responseCode: r.responseCode,
        errorMessage: r.errorMessage,
        attemptedAt: r.attemptedAt,
        completedAt: r.completedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

erpRouter.post("/sync/inventory", async (_req, res, next) => {
  try {
    const result = await syncInventoryToErp();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

erpRouter.post("/deliver-pending", async (_req, res, next) => {
  try {
    const count = await processPendingWebhooks();
    res.json({ processed: count });
  } catch (err) {
    next(err);
  }
});

erpRouter.post("/webhooks/:id/retry", async (req, res, next) => {
  try {
    await deliverWebhookEvent(req.params.id);
    const event = await prisma.webhookEvent.findUnique({ where: { id: req.params.id } });
    res.json(event);
  } catch (err) {
    next(err);
  }
});

const inboundSchema = z.object({
  source: z.string(),
  eventType: z.string(),
  payload: z.record(z.unknown()),
});

erpRouter.post("/inbound", async (req, res, next) => {
  try {
    const input = inboundSchema.parse(req.body);
    const record = await prisma.erpSyncRecord.create({
      data: {
        direction: ErpSyncDirection.INBOUND,
        syncType: input.eventType,
        destination: input.source,
        status: ErpSyncStatus.SUCCESS,
        payload: input.payload as object,
        responseCode: 200,
        completedAt: new Date(),
      },
    });
    res.status(201).json({ ack: true, syncId: record.id });
  } catch (err) {
    next(err);
  }
});
