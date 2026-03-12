# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Product: Lynx Analytics

A full-featured analytics, monitoring, and A/B testing platform — similar to PostHog but with more power.

### Key Features
- **Event Tracking**: Real-time event capture with session, user, and property data
- **Session Analysis**: Full session flows with entry/exit pages and duration tracking
- **Analytics Overview**: Daily charts, top events, top pages, key metrics
- **A/B Experiments**: Create experiments with variants, statistical significance, conversion rates
- **Logs**: Structured application log monitoring (debug/info/warn/error) with search + service filter
- **HTTP Requests**: Request monitoring with method, status, duration tracking
- **Datastore**: Per-project mini database — JSON collections, insert/query records
- **Funnels**: Multi-step funnel analysis with conversion and dropoff rates
- **Dashboards**: Custom dashboards with configurable widgets
- **Multi-project**: Multiple projects, each with their own API key

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Wouter (routing), Zustand (state), Recharts (charts), date-fns, lucide-react, framer-motion
- **UI**: Tailwind CSS v4, shadcn/ui components

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── analytics/          # React + Vite frontend (Lynx Analytics UI)
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed.ts         # Demo data seeder
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Database Schema

- `projects` — Projects with name, slug, apiKey
- `events` — Event tracking (name, sessionId, userId, properties, url, timestamp)
- `sessions` — User sessions (duration, entryPage, exitPage, device, country)
- `experiments` — A/B experiments with variants (JSONB), status, metrics
- `logs` — Application logs (level, message, service, meta, traceId)
- `requests` — HTTP request logs (method, url, statusCode, duration)
- `datastore` — Flexible JSON document store (projectId + collection + data)
- `funnels` — Multi-step funnels (steps stored as JSONB)
- `dashboards` — Custom dashboards with widgets (JSONB)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/analytics` (`@workspace/analytics`)

React + Vite frontend. Routes:
- `/` — Projects list
- `/projects/:id/overview` — Analytics overview with charts
- `/projects/:id/events` — Event stream
- `/projects/:id/sessions` — Session list + detail
- `/projects/:id/funnels` — Funnel analysis
- `/projects/:id/experiments` — A/B experiments
- `/projects/:id/logs` — Log monitoring
- `/projects/:id/requests` — HTTP request monitoring
- `/projects/:id/datastore` — Document store browser
- `/projects/:id/dashboards` — Custom dashboards

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API. Routes at `/api/projects/:projectId/*`:
- `/events` — ingest & list events
- `/sessions` — list sessions + session detail
- `/analytics/overview` — overview stats
- `/analytics/events` — event time series
- `/analytics/pageviews` — pageview breakdown
- `/experiments` — CRUD A/B experiments
- `/logs` — ingest & list logs
- `/requests` — ingest & list HTTP requests
- `/datastore` — collections + record CRUD
- `/funnels` — funnel definitions + results
- `/dashboards` — dashboard CRUD

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`
Push schema: `pnpm --filter @workspace/db run push`
Seed data: `pnpm --filter @workspace/scripts run seed`
