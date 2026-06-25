# energy-Logix
<img width="1916" height="961" alt="image" src="https://github.com/user-attachments/assets/11526173-8d63-473d-8ff1-493ac74a3bd7" />


**Multi-Asset Diluent Blender & Pipeline Disruption Simulator**

Production-ready operational logistics application for heavy crude diluent blending, pipeline disruption simulation, and commercial scheduling.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TailwindCSS |
| Backend | Node.js, TypeScript, Express |
| Database | PostgreSQL 16, Prisma ORM |
| Monorepo | npm workspaces, Turborepo |

## Project Structure

```
energy-logix/
├── apps/
│   ├── api/                    # Express REST API
│   │   └── src/
│   │       ├── routes/         # facilities, pipelines, blends, incidents, dashboard
│   │       └── middleware/
│   └── web/                    # Next.js 14 command center UI
│       └── src/app/
├── packages/
│   └── database/               # Prisma schema, migrations, seed, domain math
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── src/
│           ├── index.ts        # Prisma client export
│           └── blending.ts     # Diluent formula & utilization helpers
├── docs/
│   └── SCHEMA.md               # Full database documentation
├── docker-compose.yml          # PostgreSQL 16
└── package.json                # Workspace root
```

## Quick start

```bash
cp .env.example .env
npm install
npm run setup
npm run dev
```

| | URL |
|---|-----|
| **Web UI** | http://localhost:3000 |
| **API** | http://localhost:4000 |
| **Health check** | http://localhost:4000/health |

`npm run setup` starts Postgres, waits for readiness, migrates, and seeds demo data (cross-platform).

## Detailed setup (alternative)
- Node.js 20+
- Docker Desktop (for PostgreSQL)

### 2. Install dependencies
```bash
npm install
```

### 3. Environment
```bash
cp .env.example .env
```

### 4. Start PostgreSQL
```bash
npm run docker:up
```
PostgreSQL runs on **port 5433** (avoids conflict with local Postgres on 5432).

### 5. Run migrations & seed
```bash
npm run db:migrate:deploy
npm run db:seed
```

### 6. Start development servers
```bash
npm run dev
```

This starts both the API (port 4000) and web UI (port 3000).

- **Web UI:** http://localhost:3000
- **API:** http://localhost:4000
- **Health check:** http://localhost:4000/health

## API Endpoints

### Core Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Command center KPIs, inventory meters, pipeline matrix |
| GET | `/api/dashboard/notifications` | Recent in-app alerts |
| GET | `/api/facilities` | All facilities with storage utilization |
| GET | `/api/pipelines` | Pipeline matrix with utilization rates |
| GET | `/api/pipelines/topology` | Asset graph (nodes, edges, adjacency) |
| POST | `/api/blends/schedule` | Submit blend batch → **approval workflow** |
| POST | `/api/blends/validate` | Preview diluent requirement without persisting |
| POST | `/api/incidents/simulate` | Pipeline shutdown, reroute, Trading Desk webhook |
| PATCH | `/api/incidents/:id/resolve` | Restore pipeline to ACTIVE |

### Live SCADA Telemetry
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scada/live` | Latest tag readings + sparklines |
| GET | `/api/scada/status` | Simulator health & tag count |
| GET | `/api/scada/history/:tagCode` | Recent time-series for a tag |
| POST | `/api/scada/ingest` | Ingest OPC-UA / external telemetry |
| POST | `/api/scada/simulate-cycle` | Manual telemetry poll |

Background simulator runs every 15s (`SCADA_SIMULATOR_ENABLED=true`).

### Approval Workflows
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/approvals?status=PENDING` | Pending approval requests |
| POST | `/api/approvals/:requestNumber/approve` | Approve blend or reroute |
| POST | `/api/approvals/:requestNumber/reject` | Reject and cancel batch |

Blend batches start as `PENDING_APPROVAL` until Commercial Scheduler or Trading Desk signs off.

### ERP & Trading Desk Connectivity
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/erp/sync/status` | Recent sync log & connection status |
| POST | `/api/erp/sync/inventory` | Push inventory snapshot to ERP |
| POST | `/api/erp/deliver-pending` | Deliver pending webhooks |
| POST | `/api/erp/inbound` | Receive inbound ERP events |
| POST | `/api/erp/webhooks/:id/retry` | Retry failed webhook delivery |

Configure `TRADING_DESK_WEBHOOK_URL` and `ERP_WEBHOOK_URL` in `.env` for live HTTP delivery (demo mode acks locally when empty).

## Blending Formula

```
Required Diluent (bbl) = (Target Ratio × Bitumen Volume) / (1 - Target Ratio)
```

Target ratios typically range from 20% to 30%. If diluent inventory is insufficient, an **Inventory Depletion Warning** is raised.

## Roadmap

| Priority | Enhancement | Status |
|----------|-------------|--------|
| Configurable rule engine | Tunable blend, inventory, and disruption reroute policies | Planned |
| RBAC | Commercial Scheduler · Trading Desk · Admin | Planned |
| Enterprise integration | SCADA telemetry, ERP, approval workflows | **Implemented** |

Command Center includes **SCADA & ERP** nav section with live telemetry, approval panel, and ERP sync status.

<img width="1289" height="950" alt="image" src="https://github.com/user-attachments/assets/4f0f5f32-1fd4-4fc6-bbea-34c13c0b0f4b" />


Details: [docs/ROADMAP.md](docs/ROADMAP.md)

## License

Portfolio / demonstration project.
