import { Router } from "express";
import { prisma } from "@energy-logix/database";
import { calculateUtilizationRate } from "@energy-logix/database";

export const pipelinesRouter = Router();

pipelinesRouter.get("/", async (_req, res, next) => {
  try {
    const segments = await prisma.pipelineSegment.findMany({
      include: {
        sourceFacility: { select: { code: true, name: true } },
        destinationFacility: { select: { code: true, name: true } },
      },
      orderBy: { code: "asc" },
    });

    const matrix = segments.map((s) => ({
      ...s,
      maxDailyCapacityBbls: Number(s.maxDailyCapacityBbls),
      currentFlowBblsPerDay: Number(s.currentFlowBblsPerDay),
      utilizationRatePct: calculateUtilizationRate(
        Number(s.currentFlowBblsPerDay),
        Number(s.maxDailyCapacityBbls)
      ),
      residualCapacityBblsPerDay: Math.max(
        0,
        Number(s.maxDailyCapacityBbls) - Number(s.currentFlowBblsPerDay)
      ),
    }));

    res.json(matrix);
  } catch (err) {
    next(err);
  }
});

pipelinesRouter.get("/topology", async (_req, res, next) => {
  try {
    const [facilities, segments, adjacency] = await Promise.all([
      prisma.facility.findMany({ where: { isActive: true } }),
      prisma.pipelineSegment.findMany(),
      prisma.pipelineAdjacency.findMany({
        include: {
          primarySegment: { select: { code: true } },
          alternateSegment: { select: { code: true } },
        },
      }),
    ]);

    res.json({
      nodes: facilities.map((f) => ({
        id: f.id,
        code: f.code,
        name: f.name,
        type: f.facilityType,
      })),
      edges: segments.map((s) => ({
        id: s.id,
        code: s.code,
        source: s.sourceFacilityId,
        target: s.destinationFacilityId,
        status: s.status,
        maxDailyCapacityBbls: Number(s.maxDailyCapacityBbls),
      })),
      adjacency: adjacency.map((a) => ({
        primary: a.primarySegment.code,
        alternate: a.alternateSegment.code,
        additionalDelayDays: a.additionalDelayDays,
        priority: a.priority,
      })),
    });
  } catch (err) {
    next(err);
  }
});
