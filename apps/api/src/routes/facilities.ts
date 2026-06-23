import { Router } from "express";
import { prisma } from "@energy-logix/database";
export const facilitiesRouter = Router();

facilitiesRouter.get("/", async (_req, res, next) => {
  try {
    const facilities = await prisma.facility.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { storageTanks: true },
    });

    const enriched = facilities.map((f) => {
      const bitumen = Number(f.bitumenBbls);
      const diluent = Number(f.diluentBbls);
      const capacity = Number(f.totalStorageCapacityBbls);
      const used = bitumen + diluent;
      return {
        ...f,
        bitumenBbls: bitumen,
        diluentBbls: diluent,
        totalStorageCapacityBbls: capacity,
        storageUtilizationPct: capacity > 0 ? (used / capacity) * 100 : 0,
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

facilitiesRouter.get("/:code", async (req, res, next) => {
  try {
    const facility = await prisma.facility.findUnique({
      where: { code: req.params.code },
      include: { storageTanks: true, blendBatches: { take: 10, orderBy: { createdAt: "desc" } } },
    });
    if (!facility) return res.status(404).json({ error: "Facility not found" });
    res.json(facility);
  } catch (err) {
    next(err);
  }
});
