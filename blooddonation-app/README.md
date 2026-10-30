# Blood Donation Locator

A React + Vite blood donation dashboard with donor surveys, eligibility checks,
emergency requests, and live blood center tracking.

## Architecture

- **Frontend** (`src/`, React + Vite) handles the dashboard, survey, emergency
  requests, and the blood center locator.
- **Node API** (`server/`, Express + SQLite) handles authentication and survey
  responses on port `3001`.
- **Java live tracking service** (`tracking-service-java/`) serves blood center and
  inventory data on port `3002`. It is a dependency-free Java 8 HTTP service that
  stores its data in JSON. See `tracking-service-java/README.md` for details.

During development, Vite proxies `/api/blood-centers` and `/api/blood-inventory`
to the Java service, and the remaining `/api` routes to the Node API.

## Requirements

- Node.js 22 or newer
- A JDK 8 or newer to build the Java tracking service. A JRE is enough to run an
  existing build in `tracking-service-java/build/classes`.

## Getting started

```bash
npm install
npm run seed
npm run dev
```

`npm run dev` starts all three processes:

| Process | URL |
| --- | --- |
| Vite frontend | http://127.0.0.1:5173 |
| Node API (auth and surveys) | http://127.0.0.1:3001 |
| Java live tracking service | http://127.0.0.1:3002 |

The seed command creates the demo account `test` / `test`.

## Useful commands

```bash
npm run dev       # frontend + Node API + Java tracking service
npm run server    # Node API only
npm run tracking  # Java live tracking service only (builds it if needed)
npm run seed      # seed the demo user
npm run build     # production frontend build
npm run lint      # ESLint
```

## Tracking data

The Java service seeds sample NCR blood centers on first start and persists changes
in `tracking-service-java/data/blood-centers.json`. The old SQLite blood center and
inventory tables are no longer used by the application.
