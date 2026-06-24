import { Router } from "express";
import { z } from "zod";
import { prisma, ScadaQuality } from "@energy-logix/database";
import { runScadaTelemetryCycle } from "../services/scada-simulator.js";
import { AppError } from "../middleware/error-handler.js";

export const scadaRouter = Router();

scadaRouter.get("/live", async (_req, res, next) => {
  try {
    const tags = await prisma.scadaTag.findMany({
      where: { isActive: true },
      orderBy: { tagCode: "asc" },
    });

    const readings = await Promise.all(
      tags.map(async (tag) => {
        const latest = await prisma.scadaTelemetryReading.findFirst({
          where: { tagId: tag.id },
          orderBy: { recordedAt: "desc" },
        });
        const history = await prisma.scadaTelemetryReading.findMany({
          where: { tagId: tag.id },
          orderBy: { recordedAt: "desc" },
          take: 12,
        });
        return {
          tagCode: tag.tagCode,
          tagName: tag.tagName,
          unit: tag.unit,
          assetType: tag.assetType,
          assetCode: tag.assetCode,
          minValue: tag.minValue != null ? Number(tag.minValue) : null,
          maxValue: tag.maxValue != null ? Number(tag.maxValue) : null,
          latest: latest
            ? {
                value: Number(latest.value),
                quality: latest.quality,
                source: latest.source,
                recordedAt: latest.recordedAt,
              }
            : null,
          sparkline: history.reverse().map((r) => Number(r.value)),
        };
      })
    );

    res.json({
      source: "live_scada",
      tagCount: readings.length,
      lastCycleAt: readings[0]?.latest?.recordedAt ?? null,
      tags: readings,
    });
  } catch (err) {
    next(err);
  }
});

scadaRouter.get("/history/:tagCode", async (req, res, next) => {
  try {
    const tag = await prisma.scadaTag.findUnique({ where: { tagCode: req.params.tagCode } });
    if (!tag) throw new AppError(404, "SCADA tag not found");

    const limit = Math.min(Number(req.query.limit) || 60, 200);
    const readings = await prisma.scadaTelemetryReading.findMany({
      where: { tagId: tag.id },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });

    res.json({
      tagCode: tag.tagCode,
      readings: readings.reverse().map((r) => ({
        value: Number(r.value),
        quality: r.quality,
        source: r.source,
        recordedAt: r.recordedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const ingestSchema = z.object({
  tagCode: z.string(),
  value: z.number(),
  quality: z.enum(["GOOD", "UNCERTAIN", "BAD"]).optional(),
  source: z.string().optional(),
  recordedAt: z.string().datetime().optional(),
});

scadaRouter.post("/ingest", async (req, res, next) => {
  try {
    const input = ingestSchema.parse(req.body);
    const tag = await prisma.scadaTag.findUnique({ where: { tagCode: input.tagCode } });
    if (!tag) throw new AppError(404, `Unknown SCADA tag: ${input.tagCode}`);

    const reading = await prisma.scadaTelemetryReading.create({
      data: {
        tagId: tag.id,
        value: input.value,
        quality: (input.quality as ScadaQuality) ?? ScadaQuality.GOOD,
        source: input.source ?? "OPC_UA",
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
      },
    });

    // Apply live update to operational tables
    if (tag.assetType === "PIPELINE") {
      await prisma.pipelineSegment.updateMany({
        where: { code: tag.assetCode },
        data: { currentFlowBblsPerDay: input.value },
      });
    }

    res.status(201).json({
      id: reading.id,
      tagCode: tag.tagCode,
      value: Number(reading.value),
      recordedAt: reading.recordedAt,
    });
  } catch (err) {
    next(err);
  }
});

scadaRouter.post("/simulate-cycle", async (_req, res, next) => {
  try {
    const count = await runScadaTelemetryCycle();
    res.json({ readingsRecorded: count, message: "SCADA telemetry cycle completed" });
  } catch (err) {
    next(err);
  }
});

scadaRouter.get("/status", async (_req, res, next) => {
  try {
    const [tagCount, readingCount, latest] = await Promise.all([
      prisma.scadaTag.count({ where: { isActive: true } }),
      prisma.scadaTelemetryReading.count(),
      prisma.scadaTelemetryReading.findFirst({ orderBy: { recordedAt: "desc" } }),
    ]);
    res.json({
      enabled: true,
      simulatorIntervalSec: 15,
      activeTags: tagCount,
      totalReadings: readingCount,
      lastReadingAt: latest?.recordedAt ?? null,
    });
  } catch (err) {
    next(err);
  }
});
