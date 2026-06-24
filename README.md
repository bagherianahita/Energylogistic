# energy-Logix

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

## Quick Start

### 1. Prerequisites
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

## API Endpoints (Step 2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Command center KPIs, inventory meters, pipeline matrix |
| GET | `/api/facilities` | All facilities with storage utilization |
| GET | `/api/pipelines` | Pipeline matrix with utilization rates |
| GET | `/api/pipelines/topology` | Asset graph (nodes, edges, adjacency) |
| POST | `/api/blends/schedule` | Schedule a blend batch with formula validation |
| POST | `/api/blends/validate` | Preview diluent requirement without persisting |
| POST | `/api/incidents/simulate` | Mark pipeline shutdown, generate reroute options |
| PATCH | `/api/incidents/:id/resolve` | Restore pipeline to ACTIVE |

## Blending Formula

```
Required Diluent (bbl) = (Target Ratio × Bitumen Volume) / (1 - Target Ratio)
```

Target ratios typically range from 20% to 30%. If diluent inventory is insufficient, an **Inventory Depletion Warning** is raised.

## Roadmap

| Priority | Enhancement |
|----------|-------------|
| Configurable rule engine | Tunable blend, inventory, and disruption reroute policies |
| RBAC | Commercial Scheduler · Trading Desk · Admin |
| Enterprise integration | SCADA telemetry, ERP, approval workflows |

Details: [docs/ROADMAP.md](docs/ROADMAP.md)

## License

Portfolio / demonstration project.
