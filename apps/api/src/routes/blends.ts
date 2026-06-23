import { Router } from "express";
import { z } from "zod";
import { prisma, BlendBatchStatus, NotificationSeverity } from "@energy-logix/database";
import { calculateRequiredDiluent, isInventoryDepleted } from "@energy-logix/database";
import { AppError } from "../middleware/error-handler.js";

export const blendsRouter = Router();

const scheduleBlendSchema = z.object({
  facilityCode: z.string(),
  bitumenVolumeBbls: z.number().positive(),
  targetRatio: z.number().min(0.2).max(0.3),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

blendsRouter.get("/", async (_req, res, next) => {
  try {
    const batches = await prisma.blendBatch.findMany({
      include: { facility: { select: { code: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(batches);
  } catch (err) {
    next(err);
  }
});

blendsRouter.post("/schedule", async (req, res, next) => {
  try {
    const input = scheduleBlendSchema.parse(req.body);

    const facility = await prisma.facility.findUnique({
      where: { code: input.facilityCode },
    });
    if (!facility) throw new AppError(404, "Facility not found");

    const requiredDiluent = calculateRequiredDiluent(
      input.bitumenVolumeBbls,
      input.targetRatio
    );
    const availableDiluent = Number(facility.diluentBbls);
    const depleted = isInventoryDepleted(availableDiluent, requiredDiluent);
    const bitumenAvailable = Number(facility.bitumenBbls);

    if (input.bitumenVolumeBbls > bitumenAvailable) {
      throw new AppError(422, "Insufficient bitumen inventory for scheduled blend", {
        available: bitumenAvailable,
        requested: input.bitumenVolumeBbls,
      });
    }

    const batchNumber = `BLEND-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const status = depleted ? BlendBatchStatus.INVENTORY_WARNING : BlendBatchStatus.SCHEDULED;

    const batch = await prisma.blendBatch.create({
      data: {
        batchNumber,
        facilityId: facility.id,
        bitumenVolumeBbls: input.bitumenVolumeBbls,
        targetRatio: input.targetRatio,
        requiredDiluentBbls: requiredDiluent,
        totalBlendedVolumeBbls: input.bitumenVolumeBbls + requiredDiluent,
        status,
        inventoryWarning: depleted,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
        notes: input.notes,
      },
      include: { facility: { select: { code: true, name: true } } },
    });

    if (depleted) {
      await prisma.notification.create({
        data: {
          title: "Inventory Depletion Warning",
          message: `${facility.name} diluent inventory (${availableDiluent.toLocaleString()} bbl) is below required blend amount (${requiredDiluent.toLocaleString()} bbl) for batch ${batchNumber}.`,
          severity: NotificationSeverity.HIGH_PRIORITY,
          metadata: {
            facilityCode: facility.code,
            batchNumber,
            availableDiluentBbls: availableDiluent,
            requiredDiluentBbls: requiredDiluent,
          },
        },
      });
    }

    res.status(201).json({
      batch,
      validation: {
        requiredDiluentBbls: requiredDiluent,
        formula: "Required Diluent = (Target Ratio × Bitumen Volume) / (1 - Target Ratio)",
        inventoryDepletionWarning: depleted,
      },
    });
  } catch (err) {
    next(err);
  }
});

blendsRouter.post("/validate", async (req, res, next) => {
  try {
    const { bitumenVolumeBbls, targetRatio, facilityCode } = req.body;
    const requiredDiluent = calculateRequiredDiluent(bitumenVolumeBbls, targetRatio);

    let availableDiluent: number | null = null;
    let depleted = false;

    if (facilityCode) {
      const facility = await prisma.facility.findUnique({ where: { code: facilityCode } });
      if (facility) {
        availableDiluent = Number(facility.diluentBbls);
        depleted = isInventoryDepleted(availableDiluent, requiredDiluent);
      }
    }

    res.json({
      bitumenVolumeBbls,
      targetRatio,
      requiredDiluentBbls: requiredDiluent,
      totalBlendedVolumeBbls: bitumenVolumeBbls + requiredDiluent,
      availableDiluentBbls: availableDiluent,
      inventoryDepletionWarning: depleted,
    });
  } catch (err) {
    next(err);
  }
});
