import { Router } from "express";
import { z } from "zod";
import {
  prisma,
  PipelineStatus,
  IncidentStatus,
  ShipmentStatus,
  RerouteOptionType,
  NotificationSeverity,
  WebhookDeliveryStatus,
} from "@energy-logix/database";
import { calculateResidualCapacity } from "@energy-logix/database";
import { AppError } from "../middleware/error-handler.js";

export const incidentsRouter = Router();

const simulateIncidentSchema = z.object({
  pipelineCode: z.string(),
  estimatedDurationDays: z.number().int().min(1).max(30).default(7),
  title: z.string().optional(),
  description: z.string().optional(),
});

incidentsRouter.get("/", async (_req, res, next) => {
  try {
    const incidents = await prisma.pipelineIncident.findMany({
      include: {
        pipelineSegment: {
          include: {
            sourceFacility: { select: { code: true, name: true } },
            destinationFacility: { select: { code: true, name: true } },
          },
        },
        rerouteOptions: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(incidents);
  } catch (err) {
    next(err);
  }
});

incidentsRouter.post("/simulate", async (req, res, next) => {
  try {
    const input = simulateIncidentSchema.parse(req.body);

    const segment = await prisma.pipelineSegment.findUnique({
      where: { code: input.pipelineCode },
      include: {
        adjacencyAsPrimary: {
          include: { alternateSegment: true },
          orderBy: { priority: "asc" },
        },
      },
    });

    if (!segment) throw new AppError(404, "Pipeline segment not found");
    if (segment.status === PipelineStatus.SHUTDOWN) {
      throw new AppError(409, "Pipeline segment is already shut down");
    }

    const activeShipments = await prisma.shipment.findMany({
      where: {
        pipelineSegmentId: segment.id,
        status: { in: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.SCHEDULED] },
      },
    });

    const incidentNumber = `INC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    const result = await prisma.$transaction(async (tx) => {
      await tx.pipelineSegment.update({
        where: { id: segment.id },
        data: { status: PipelineStatus.SHUTDOWN, isOperational: false },
      });

      const incident = await tx.pipelineIncident.create({
        data: {
          incidentNumber,
          pipelineSegmentId: segment.id,
          title: input.title ?? `Simulated shutdown: ${segment.name}`,
          description:
            input.description ??
            `Unplanned ${input.estimatedDurationDays}-day outage on ${segment.code}`,
          status: IncidentStatus.OPEN,
          estimatedDurationDays: input.estimatedDurationDays,
          isSimulated: true,
        },
      });

      const rerouteOptions = [];
      let totalShortfall = 0;
      let totalDelayDays = 0;

      for (const shipment of activeShipments) {
        const volume = Number(shipment.volumeBbls);
        totalShortfall += volume;

        // Option A: Reroute to adjacent pipeline with residual capacity
        for (const adj of segment.adjacencyAsPrimary) {
          const alt = adj.alternateSegment;
          const residual = calculateResidualCapacity(
            Number(alt.currentFlowBblsPerDay),
            Number(alt.maxDailyCapacityBbls)
          );

          if (alt.status !== PipelineStatus.SHUTDOWN && residual >= volume) {
            const option = await tx.rerouteOption.create({
              data: {
                incidentId: incident.id,
                shipmentId: shipment.id,
                optionType: RerouteOptionType.REROUTE,
                targetPipelineSegmentId: alt.id,
                divertedVolumeBbls: volume,
                estimatedDelayDays: adj.additionalDelayDays + input.estimatedDurationDays,
                residualCapacityUsedBbls: volume,
                isRecommended: adj.priority === 1,
              },
            });
            rerouteOptions.push(option);
            totalDelayDays += adj.additionalDelayDays;
            break;
          }
        }

        // Option B: Divert to terminal storage
        const terminal = await tx.facility.findFirst({
          where: { facilityType: "TERMINAL", isActive: true },
          include: { storageTanks: { where: { productType: "BLEND", isOperational: true } } },
        });

        if (terminal) {
          const tank = terminal.storageTanks[0];
          if (tank) {
            const available = Number(tank.maxCapacityBbls) - Number(tank.currentVolumeBbls);
            if (available >= volume) {
              const option = await tx.rerouteOption.create({
                data: {
                  incidentId: incident.id,
                  shipmentId: shipment.id,
                  optionType: RerouteOptionType.STORAGE_DIVERT,
                  storageFacilityId: terminal.id,
                  divertedVolumeBbls: volume,
                  estimatedDelayDays: input.estimatedDurationDays + 2,
                  isRecommended: false,
                },
              });
              rerouteOptions.push(option);
            }
          }
        }

        await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: ShipmentStatus.DELAYED,
            originalPipelineSegmentId: segment.id,
            delayDays: input.estimatedDurationDays,
          },
        });
      }

      const updatedIncident = await tx.pipelineIncident.update({
        where: { id: incident.id },
        data: {
          totalVolumeShortfallBbls: totalShortfall,
          totalDelayShipmentDays: totalDelayDays || input.estimatedDurationDays * activeShipments.length,
        },
      });

      const webhookPayload = {
        event: "PIPELINE_DISRUPTION",
        incidentNumber,
        pipelineCode: segment.code,
        pipelineName: segment.name,
        estimatedDurationDays: input.estimatedDurationDays,
        affectedShipments: activeShipments.length,
        totalVolumeShortfallBbls: totalShortfall,
        deliveryDelays: activeShipments.map((s) => ({
          shipmentNumber: s.shipmentNumber,
          volumeBbls: Number(s.volumeBbls),
          delayDays: input.estimatedDurationDays,
        })),
        rerouteOptionsGenerated: rerouteOptions.length,
        timestamp: new Date().toISOString(),
      };

      await tx.webhookEvent.create({
        data: {
          incidentId: incident.id,
          eventType: "PIPELINE_DISRUPTION",
          destination: "COMMERCIAL_TRADING_DESK",
          payload: webhookPayload,
          deliveryStatus: WebhookDeliveryStatus.PENDING,
        },
      });

      await tx.notification.create({
        data: {
          incidentId: incident.id,
          title: "Pipeline Disruption — Trading Desk Alert",
          message: `${segment.name} marked non-operational. ${activeShipments.length} shipment(s) affected, ${totalShortfall.toLocaleString()} bbl shortfall.`,
          severity: NotificationSeverity.CRITICAL,
          metadata: webhookPayload,
        },
      });

      return { incident: updatedIncident, rerouteOptions, activeShipments, webhookPayload };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

incidentsRouter.patch("/:incidentNumber/resolve", async (req, res, next) => {
  try {
    const incident = await prisma.pipelineIncident.findUnique({
      where: { incidentNumber: req.params.incidentNumber },
      include: { pipelineSegment: true },
    });
    if (!incident) throw new AppError(404, "Incident not found");

    await prisma.$transaction([
      prisma.pipelineIncident.update({
        where: { id: incident.id },
        data: { status: IncidentStatus.RESOLVED, resolvedAt: new Date() },
      }),
      prisma.pipelineSegment.update({
        where: { id: incident.pipelineSegmentId },
        data: { status: PipelineStatus.ACTIVE, isOperational: true },
      }),
    ]);

    res.json({ message: "Incident resolved, pipeline restored to ACTIVE" });
  } catch (err) {
    next(err);
  }
});
