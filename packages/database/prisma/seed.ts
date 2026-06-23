import {
  PrismaClient,
  FacilityType,
  PipelineStatus,
  BlendBatchStatus,
  ShipmentStatus,
  NotificationSeverity,
} from "@prisma/client";
import { calculateRequiredDiluent } from "../src/blending";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding energy-Logix database...");

  // ─── Facilities ───────────────────────────────────────────────────────────
  // Realistic thermal SAGD asset scales (thousands of bbls inventory, ~150-200k bbl/d production)

  const fosterCreek = await prisma.facility.upsert({
    where: { code: "FOSTER_CREEK" },
    update: {},
    create: {
      code: "FOSTER_CREEK",
      name: "Foster Creek",
      facilityType: FacilityType.PRODUCTION_ASSET,
      region: "Athabasca Thermal",
      bitumenBbls: 485_000,
      diluentBbls: 142_000,
      totalStorageCapacityBbls: 750_000,
      nominalProductionBblsPerDay: 180_000,
    },
  });

  const christinaLake = await prisma.facility.upsert({
    where: { code: "CHRISTINA_LAKE" },
    update: {},
    create: {
      code: "CHRISTINA_LAKE",
      name: "Christina Lake",
      facilityType: FacilityType.PRODUCTION_ASSET,
      region: "Athabasca Thermal",
      bitumenBbls: 520_000,
      diluentBbls: 98_000,
      totalStorageCapacityBbls: 800_000,
      nominalProductionBblsPerDay: 195_000,
    },
  });

  const sunrise = await prisma.facility.upsert({
    where: { code: "SUNRISE" },
    update: {},
    create: {
      code: "SUNRISE",
      name: "Sunrise",
      facilityType: FacilityType.PRODUCTION_ASSET,
      region: "Peace River Thermal",
      bitumenBbls: 310_000,
      diluentBbls: 45_000, // Low diluent — will trigger inventory warning on large blend
      totalStorageCapacityBbls: 500_000,
      nominalProductionBblsPerDay: 120_000,
    },
  });

  const lloydHub = await prisma.facility.upsert({
    where: { code: "LLOYD_HUB" },
    update: {},
    create: {
      code: "LLOYD_HUB",
      name: "Lloydminster Gathering Hub",
      facilityType: FacilityType.MIDSTREAM_HUB,
      region: "Lloydminster",
      bitumenBbls: 220_000,
      diluentBbls: 185_000,
      totalStorageCapacityBbls: 600_000,
    },
  });

  const lloydUpgrader = await prisma.facility.upsert({
    where: { code: "LLOYD_UPGRADER" },
    update: {},
    create: {
      code: "LLOYD_UPGRADER",
      name: "Lloydminster Upgrader",
      facilityType: FacilityType.UPGRADER,
      region: "Lloydminster",
      bitumenBbls: 380_000,
      diluentBbls: 95_000,
      totalStorageCapacityBbls: 1_200_000,
    },
  });

  const refineryEast = await prisma.facility.upsert({
    where: { code: "REFINERY_EAST" },
    update: {},
    create: {
      code: "REFINERY_EAST",
      name: "Eastern Refinery Complex",
      facilityType: FacilityType.REFINERY,
      region: "Downstream",
      bitumenBbls: 0,
      diluentBbls: 50_000,
      totalStorageCapacityBbls: 400_000,
    },
  });

  const hardistyTerminal = await prisma.facility.upsert({
    where: { code: "HARDISTY_TERMINAL" },
    update: {},
    create: {
      code: "HARDISTY_TERMINAL",
      name: "Hardisty Terminal",
      facilityType: FacilityType.TERMINAL,
      region: "Hardisty",
      bitumenBbls: 150_000,
      diluentBbls: 200_000,
      totalStorageCapacityBbls: 500_000,
    },
  });

  // ─── Storage Tanks (diversion targets during disruptions) ───────────────────

  await prisma.storageTank.createMany({
    data: [
      {
        facilityId: lloydHub.id,
        name: "Tank A — Blend",
        productType: "BLEND",
        maxCapacityBbls: 150_000,
        currentVolumeBbls: 62_000,
      },
      {
        facilityId: lloydHub.id,
        name: "Tank B — Bitumen",
        productType: "BITUMEN",
        maxCapacityBbls: 120_000,
        currentVolumeBbls: 48_000,
      },
      {
        facilityId: hardistyTerminal.id,
        name: "Tank 1 — Diluent",
        productType: "DILUENT",
        maxCapacityBbls: 100_000,
        currentVolumeBbls: 35_000,
      },
      {
        facilityId: hardistyTerminal.id,
        name: "Tank 2 — Blend",
        productType: "BLEND",
        maxCapacityBbls: 200_000,
        currentVolumeBbls: 78_000,
      },
    ],
    skipDuplicates: true,
  });

  // ─── Pipeline Topology Graph ──────────────────────────────────────────────

  const pipelines = await Promise.all([
    prisma.pipelineSegment.upsert({
      where: { code: "PL-FC-LH" },
      update: {},
      create: {
        code: "PL-FC-LH",
        name: "Foster Creek → Lloyd Hub",
        sourceFacilityId: fosterCreek.id,
        destinationFacilityId: lloydHub.id,
        status: PipelineStatus.ACTIVE,
        maxDailyCapacityBbls: 200_000,
        currentFlowBblsPerDay: 165_000,
        lengthKm: 85,
        transitHours: 18,
      },
    }),
    prisma.pipelineSegment.upsert({
      where: { code: "PL-CL-LH" },
      update: {},
      create: {
        code: "PL-CL-LH",
        name: "Christina Lake → Lloyd Hub",
        sourceFacilityId: christinaLake.id,
        destinationFacilityId: lloydHub.id,
        status: PipelineStatus.ACTIVE,
        maxDailyCapacityBbls: 220_000,
        currentFlowBblsPerDay: 188_000,
        lengthKm: 92,
        transitHours: 20,
      },
    }),
    prisma.pipelineSegment.upsert({
      where: { code: "PL-SR-LH" },
      update: {},
      create: {
        code: "PL-SR-LH",
        name: "Sunrise → Lloyd Hub",
        sourceFacilityId: sunrise.id,
        destinationFacilityId: lloydHub.id,
        status: PipelineStatus.RESTRICTED,
        maxDailyCapacityBbls: 140_000,
        currentFlowBblsPerDay: 112_000,
        lengthKm: 110,
        transitHours: 24,
      },
    }),
    prisma.pipelineSegment.upsert({
      where: { code: "PL-LH-UP" },
      update: {},
      create: {
        code: "PL-LH-UP",
        name: "Lloyd Hub → Upgrader",
        sourceFacilityId: lloydHub.id,
        destinationFacilityId: lloydUpgrader.id,
        status: PipelineStatus.ACTIVE,
        maxDailyCapacityBbls: 350_000,
        currentFlowBblsPerDay: 298_000,
        lengthKm: 12,
        transitHours: 4,
      },
    }),
    prisma.pipelineSegment.upsert({
      where: { code: "PL-LH-HT" },
      update: {},
      create: {
        code: "PL-LH-HT",
        name: "Lloyd Hub → Hardisty Terminal",
        sourceFacilityId: lloydHub.id,
        destinationFacilityId: hardistyTerminal.id,
        status: PipelineStatus.ACTIVE,
        maxDailyCapacityBbls: 180_000,
        currentFlowBblsPerDay: 95_000,
        lengthKm: 65,
        transitHours: 14,
      },
    }),
    prisma.pipelineSegment.upsert({
      where: { code: "PL-HT-RF" },
      update: {},
      create: {
        code: "PL-HT-RF",
        name: "Hardisty → Eastern Refinery",
        sourceFacilityId: hardistyTerminal.id,
        destinationFacilityId: refineryEast.id,
        status: PipelineStatus.ACTIVE,
        maxDailyCapacityBbls: 160_000,
        currentFlowBblsPerDay: 72_000,
        lengthKm: 420,
        transitHours: 48,
      },
    }),
    prisma.pipelineSegment.upsert({
      where: { code: "PL-CL-HT" },
      update: {},
      create: {
        code: "PL-CL-HT",
        name: "Christina Lake → Hardisty (Alternate)",
        sourceFacilityId: christinaLake.id,
        destinationFacilityId: hardistyTerminal.id,
        status: PipelineStatus.ACTIVE,
        maxDailyCapacityBbls: 100_000,
        currentFlowBblsPerDay: 42_000,
        lengthKm: 145,
        transitHours: 30,
      },
    }),
  ]);

  const [plFcLh, plClLh, plSrLh, plLhUp, plLhHt, , plClHt] = pipelines;

  // ─── Pipeline Adjacency (reroute graph) ───────────────────────────────────

  await prisma.pipelineAdjacency.createMany({
    data: [
      {
        primarySegmentId: plFcLh.id,
        alternateSegmentId: plClLh.id,
        additionalDelayDays: 2,
        priority: 2,
      },
      {
        primarySegmentId: plClLh.id,
        alternateSegmentId: plClHt.id,
        additionalDelayDays: 3,
        priority: 1,
      },
      {
        primarySegmentId: plSrLh.id,
        alternateSegmentId: plClLh.id,
        additionalDelayDays: 4,
        priority: 1,
      },
      {
        primarySegmentId: plLhUp.id,
        alternateSegmentId: plLhHt.id,
        additionalDelayDays: 5,
        priority: 1,
      },
    ],
    skipDuplicates: true,
  });

  // ─── Blend Batches ────────────────────────────────────────────────────────

  const targetRatio = 0.28;
  const bitumenVol = 25_000;
  const requiredDiluent = calculateRequiredDiluent(bitumenVol, targetRatio);

  const blendFoster = await prisma.blendBatch.upsert({
    where: { batchNumber: "BLEND-2025-0041" },
    update: {},
    create: {
      batchNumber: "BLEND-2025-0041",
      facilityId: fosterCreek.id,
      bitumenVolumeBbls: bitumenVol,
      targetRatio,
      requiredDiluentBbls: requiredDiluent,
      totalBlendedVolumeBbls: bitumenVol + requiredDiluent,
      status: BlendBatchStatus.SCHEDULED,
      inventoryWarning: false,
      scheduledAt: new Date("2025-06-24T06:00:00Z"),
    },
  });

  // Sunrise blend — diluent inventory insufficient (45k available, ~17.5k required for 50k bitumen at 26%)
  const sunriseBitumen = 50_000;
  const sunriseRatio = 0.26;
  const sunriseDiluent = calculateRequiredDiluent(sunriseBitumen, sunriseRatio);
  await prisma.blendBatch.upsert({
    where: { batchNumber: "BLEND-2025-0042" },
    update: {},
    create: {
      batchNumber: "BLEND-2025-0042",
      facilityId: sunrise.id,
      bitumenVolumeBbls: sunriseBitumen,
      targetRatio: sunriseRatio,
      requiredDiluentBbls: sunriseDiluent,
      totalBlendedVolumeBbls: sunriseBitumen + sunriseDiluent,
      status: BlendBatchStatus.INVENTORY_WARNING,
      inventoryWarning: Number(sunrise.diluentBbls) < sunriseDiluent,
      scheduledAt: new Date("2025-06-25T08:00:00Z"),
      notes: "Inventory Depletion Warning — diluent below required blend amount",
    },
  });

  // ─── Active Shipments ─────────────────────────────────────────────────────

  const now = new Date();
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  await prisma.shipment.createMany({
    data: [
      {
        shipmentNumber: "SHP-2025-1187",
        blendBatchId: blendFoster.id,
        pipelineSegmentId: plFcLh.id,
        originFacilityId: fosterCreek.id,
        destinationFacilityId: lloydHub.id,
        volumeBbls: 32_150,
        status: ShipmentStatus.IN_TRANSIT,
        scheduledDepartureAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        actualDepartureAt: new Date(now.getTime() - 11 * 60 * 60 * 1000),
        estimatedArrivalAt: inTwoDays,
      },
      {
        shipmentNumber: "SHP-2025-1188",
        pipelineSegmentId: plClLh.id,
        originFacilityId: christinaLake.id,
        destinationFacilityId: lloydHub.id,
        volumeBbls: 28_400,
        status: ShipmentStatus.IN_TRANSIT,
        scheduledDepartureAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        actualDepartureAt: new Date(now.getTime() - 7 * 60 * 60 * 1000),
        estimatedArrivalAt: inTwoDays,
      },
      {
        shipmentNumber: "SHP-2025-1189",
        pipelineSegmentId: plLhUp.id,
        originFacilityId: lloydHub.id,
        destinationFacilityId: lloydUpgrader.id,
        volumeBbls: 45_000,
        status: ShipmentStatus.SCHEDULED,
        scheduledDepartureAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
        estimatedArrivalAt: new Date(now.getTime() + 10 * 60 * 60 * 1000),
      },
      {
        shipmentNumber: "SHP-2025-1190",
        pipelineSegmentId: plSrLh.id,
        originFacilityId: sunrise.id,
        destinationFacilityId: lloydHub.id,
        volumeBbls: 18_750,
        status: ShipmentStatus.IN_TRANSIT,
        scheduledDepartureAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        actualDepartureAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        estimatedArrivalAt: new Date(now.getTime() + 20 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  // ─── Notifications ────────────────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      {
        title: "Inventory Depletion Warning",
        message: `Sunrise diluent inventory (45,000 bbl) is below required blend amount (${sunriseDiluent.toLocaleString()} bbl) for batch BLEND-2025-0042.`,
        severity: NotificationSeverity.HIGH_PRIORITY,
        metadata: {
          facilityCode: "SUNRISE",
          batchNumber: "BLEND-2025-0042",
          availableDiluentBbls: 45_000,
          requiredDiluentBbls: sunriseDiluent,
        },
      },
      {
        title: "Pipeline Restricted",
        message: "Sunrise → Lloyd Hub segment operating at restricted capacity (80% utilization). Monitor for scheduling impacts.",
        severity: NotificationSeverity.WARNING,
        metadata: { pipelineCode: "PL-SR-LH", utilizationPct: 80 },
      },
    ],
  });

  // ─── Inventory Ledger (opening balances) ──────────────────────────────────

  const facilities = [fosterCreek, christinaLake, sunrise, lloydHub, lloydUpgrader];
  for (const f of facilities) {
    await prisma.inventoryLedger.create({
      data: {
        facilityId: f.id,
        transactionType: "OPENING_BALANCE",
        bitumenDeltaBbls: f.bitumenBbls,
        diluentDeltaBbls: f.diluentBbls,
        referenceType: "Seed",
        balanceBitumenAfter: f.bitumenBbls,
        balanceDiluentAfter: f.diluentBbls,
      },
    });
  }

  console.log("Seed complete.");
  console.log(`  Facilities: ${facilities.length + 2}`);
  console.log(`  Pipeline segments: ${pipelines.length}`);
  console.log(`  Blend batches: 2`);
  console.log(`  Active shipments: 4`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
