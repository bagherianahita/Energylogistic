import { prisma, ScadaQuality } from "@energy-logix/database";

const JITTER = 0.03;

function jitter(value: number, pct = JITTER): number {
  const delta = value * pct * (Math.random() * 2 - 1);
  return Math.max(0, Math.round((value + delta) * 100) / 100);
}

/**
 * Simulates live SCADA telemetry: updates pipeline flows from tags and records readings.
 */
export async function runScadaTelemetryCycle(): Promise<number> {
  const tags = await prisma.scadaTag.findMany({ where: { isActive: true } });
  if (tags.length === 0) return 0;

  const now = new Date();
  let count = 0;

  for (const tag of tags) {
    let value = 0;

    if (tag.assetType === "PIPELINE") {
      const segment = await prisma.pipelineSegment.findUnique({ where: { code: tag.assetCode } });
      if (!segment || segment.status === "SHUTDOWN") {
        value = 0;
      } else {
        const base = Number(segment.currentFlowBblsPerDay);
        value = jitter(base);
        const max = Number(segment.maxDailyCapacityBbls);
        value = Math.min(value, max);
        await prisma.pipelineSegment.update({
          where: { id: segment.id },
          data: { currentFlowBblsPerDay: value },
        });
      }
    } else if (tag.assetType === "FACILITY") {
      const facility = await prisma.facility.findUnique({ where: { code: tag.assetCode } });
      if (facility) {
        const total = Number(facility.bitumenBbls) + Number(facility.diluentBbls);
        value = jitter(total, 0.005);
      }
    } else if (tag.assetType === "TANK") {
      const tank = await prisma.storageTank.findFirst({
        where: { name: tag.assetCode },
        include: { facility: true },
      });
      if (tank) {
        value = jitter(Number(tank.currentVolumeBbls), 0.008);
        const max = Number(tank.maxCapacityBbls);
        value = Math.min(value, max);
      }
    }

    const quality =
      tag.minValue != null && value < Number(tag.minValue)
        ? ScadaQuality.UNCERTAIN
        : tag.maxValue != null && value > Number(tag.maxValue)
          ? ScadaQuality.BAD
          : ScadaQuality.GOOD;

    await prisma.scadaTelemetryReading.create({
      data: {
        tagId: tag.id,
        value,
        quality,
        source: "SCADA_SIMULATOR",
        recordedAt: now,
      },
    });
    count++;
  }

  // Prune old readings (keep last 500 per tag)
  for (const tag of tags) {
    const old = await prisma.scadaTelemetryReading.findMany({
      where: { tagId: tag.id },
      orderBy: { recordedAt: "desc" },
      skip: 500,
      select: { id: true },
    });
    if (old.length > 0) {
      await prisma.scadaTelemetryReading.deleteMany({
        where: { id: { in: old.map((r) => r.id) } },
      });
    }
  }

  return count;
}

export function startScadaSimulator(intervalMs = 15_000): NodeJS.Timeout {
  const tick = () => {
    runScadaTelemetryCycle().catch((err) =>
      console.warn("[SCADA] telemetry cycle failed:", err instanceof Error ? err.message : err)
    );
  };
  tick();
  return setInterval(tick, intervalMs);
}
