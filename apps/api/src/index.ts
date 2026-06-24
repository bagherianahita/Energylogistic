import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./routes/health.js";
import { facilitiesRouter } from "./routes/facilities.js";
import { pipelinesRouter } from "./routes/pipelines.js";
import { blendsRouter } from "./routes/blends.js";
import { incidentsRouter } from "./routes/incidents.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { scadaRouter } from "./routes/scada.js";
import { approvalsRouter, erpRouter } from "./routes/integrations.js";
import { errorHandler } from "./middleware/error-handler.js";
import { startScadaSimulator } from "./services/scada-simulator.js";
import { startErpDeliveryWorker } from "./services/erp-delivery.js";

const app = express();
const PORT = Number(process.env.API_PORT) || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/api/facilities", facilitiesRouter);
app.use("/api/pipelines", pipelinesRouter);
app.use("/api/blends", blendsRouter);
app.use("/api/incidents", incidentsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/scada", scadaRouter);
app.use("/api/approvals", approvalsRouter);
app.use("/api/erp", erpRouter);

app.use(errorHandler);

if (process.env.SCADA_SIMULATOR_ENABLED !== "false") {
  startScadaSimulator(Number(process.env.SCADA_INTERVAL_MS) || 15_000);
  console.log("SCADA telemetry simulator started");
}

startErpDeliveryWorker(Number(process.env.ERP_DELIVERY_INTERVAL_MS) || 30_000);
console.log("ERP webhook delivery worker started");

app.listen(PORT, () => {
  console.log(`energy-Logix API listening on port ${PORT}`);
});
