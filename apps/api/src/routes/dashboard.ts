import { Router } from "express";
import { prisma } from "@energy-logix/database";
import { calculateUtilizationRate } from "@energy-logix/database";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", async (_req, res, next) => {
  try {
    const [facilities, pipelines, activeShipments, openIncidents, unreadNotifications, inventoryWarnings, pendingApprovals, scadaTagCount] =
      await Promise.all([
        prisma.facility.findMany({
          where: {
            isActive: true,
            facilityType: { in: ["PRODUCTION_ASSET", "UPGRADER"] },
          },
          orderBy: { name: "asc" },
        }),
        prisma.pipelineSegment.findMany({
          include: {
            sourceFacility: { select: { code: true, name: true } },
            destinationFacility: { select: { code: true, name: true } },
          },
        }),
        prisma.shipment.count({
          where: { status: { in: ["IN_TRANSIT", "SCHEDULED", "DELAYED"] } },
        }),
        prisma.pipelineIncident.count({ where: { status: "OPEN" } }),
        prisma.notification.count({ where: { isRead: false } }),
        prisma.blendBatch.count({ where: { inventoryWarning: true } }),
        prisma.approvalRequest.count({ where: { status: "PENDING" } }),
        prisma.scadaTag.count({ where: { isActive: true } }),
      ]);

    const inventoryMeters = facilities.map((f) => {
      const bitumen = Number(f.bitumenBbls);
      const diluent = Number(f.diluentBbls);
      const capacity = Number(f.totalStorageCapacityBbls);
      const used = bitumen + diluent;
      return {
        code: f.code,
        name: f.name,
        bitumenBbls: bitumen,
        diluentBbls: diluent,
        totalStorageCapacityBbls: capacity,
        storageUtilizationPct: capacity > 0 ? Math.round((used / capacity) * 100) : 0,
        status: used / capacity > 0.85 ? "restricted" : "optimal",
      };
    });

    const pipelineMatrix = pipelines.map((p) => ({
      code: p.code,
      name: p.name,
      source: p.sourceFacility.name,
      destination: p.destinationFacility.name,
      status: p.status,
      utilizationRatePct: Math.round(
        calculateUtilizationRate(
          Number(p.currentFlowBblsPerDay),
          Number(p.maxDailyCapacityBbls)
        )
      ),
      maxDailyCapacityBbls: Number(p.maxDailyCapacityBbls),
      currentFlowBblsPerDay: Number(p.currentFlowBblsPerDay),
    }));

    res.json({
      inventoryMeters,
      pipelineMatrix,
      kpis: {
        activeShipments,
        openIncidents,
        unreadNotifications,
        inventoryWarnings,
        pendingApprovals,
        scadaTagCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/notifications", async (_req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});
