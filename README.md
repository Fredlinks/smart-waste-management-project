# CleanCollect — Smart Waste Management Platform

A national, role-based waste-management platform for Ghana: household pickups,
driver dispatch, live truck tracking, route optimization, billing, and
nationwide operations analytics — all from a single React + Express process.

![Status: reference / demo](https://img.shields.io/badge/status-reference%20%2F%20demo-2ea44f)
![Stack: React 19 + Express 4](https://img.shields.io/badge/stack-React%2019%20%2B%20Express%204-1d4ed8)
![Storage: JSON file](https://img.shields.io/badge/storage-data%2Fdb.json-475569)
![Real-time: SSE](https://img.shields.io/badge/real--time-SSE-9333ea)

## Highlights

- **One process, one port** — Vite dev server + Express API share `:3000`,
  so there is no CORS maze in development.
- **Three roles in one app** — Customer, Driver, Admin portals with a shared
  map, shared theme, and shared auth context.
- **Live tracking** — driver GPS pushes hit the API, which fans them out to
  every connected viewer via Server-Sent Events.
- **Smart pricing + routing** — base + per-unit × quantity + Haversine
  distance to the nearest regional depot, with an express surcharge and VAT;
  route optimization is nearest-neighbour with express bias and reports fuel
  and CO₂ savings.
- **Realistic Ghana data** — all 16 regions modelled with capitals, depots,
  landfills, and coordinates.
- **Persistent demo data** — every write goes to `data/db.json` atomically;
  reset to the demo state with one click.
- **Polished UI** — Tailwind v4, light/dark theme, accessible forms,
  `lucide-react` icons, Recharts analytics, Leaflet maps with a dark-mode
  filter and a pulsing "you are here" marker.

## Quick start

```powershell
# Windows / PowerShell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
npm install
copy .env.example .env       # optional: edit GEMINI_API_KEY
npm run dev
# -> http://localhost:3000
```

Then open the app and sign in as one of the demo accounts (or register /
apply from the modal).

## Demo accounts

| Role     | Identifier                    | Password      |
|----------|-------------------------------|---------------|
| Customer | `kwame@example.com`           | `password123` |
| Driver   | `kofi.driver@cleancollect.com`| `password123` |
| Admin    | `admin@cleancollect.com`      | `admin123`    |

You can also click **Register as Customer** or **Apply to drive** from the
auth modal.

## Documentation

- **[Project guide](docs/PROJECT.md)** — architecture, file layout, front-end
  tour, back-end tour, persistence, SSE, security, deployment, troubleshooting.
- **[API reference](docs/API.md)** — every endpoint, with request/response
  shapes, error codes, and a type sketch.

## Scripts

| Script              | What it does                                           |
|---------------------|--------------------------------------------------------|
| `npm run dev`       | Vite + Express on `:3000` (HMR on).                    |
| `npm run dev:api`   | API only (no Vite).                                    |
| `npm run build`     | Vite client build + esbuild server bundle.             |
| `npm start`         | `node dist/server.cjs` (production).                   |
| `npm run lint`      | `tsc --noEmit` (type check).                           |
| `npm run clean`     | Remove `dist/`.                                        |

## Project structure (top level)

```
.
├── server.ts                # dev: Vite + API in one process
├── backend/                 # Express app, auth, schemas, JSON DB
├── src/                     # React app, contexts, hooks, components
├── data/db.json             # auto-created on first run
├── docs/                    # PROJECT.md, API.md
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

See [docs/PROJECT.md § 6](docs/PROJECT.md#6-project-layout) for the full tree.

## License

Internal demo / reference project. Replace with your own LICENSE before
shipping.
