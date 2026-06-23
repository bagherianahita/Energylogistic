import { Router } from "express";
import { prisma } from "@energy-logix/database";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", service: "energy-logix-api", database: "connected" });
  } catch {
    res.status(503).json({ status: "degraded", service: "energy-logix-api", database: "disconnected" });
  }
});
