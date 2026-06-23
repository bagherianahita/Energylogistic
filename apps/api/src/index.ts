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
import { errorHandler } from "./middleware/error-handler.js";

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

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`energy-Logix API listening on port ${PORT}`);
});
