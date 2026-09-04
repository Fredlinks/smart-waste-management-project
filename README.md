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
├── server.prod.ts           # prod: serves dist/ + mounts createApp()
├── backend/                 # Express app, auth, schemas, JSON DB
├── src/                     # React app, contexts, hooks, components
├── data/db.json             # auto-created on first run
├── docs/                    # PROJECT.md, API.md
├── render.yaml              # one-click deploy on Render
├── railway.toml             # Railway config
├── fly.toml                 # Fly.io config
├── Dockerfile               # generic Docker / Fly / VPS
├── Procfile                 # Heroku / Railway compat
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

See [docs/PROJECT.md § 6](docs/PROJECT.md#6-project-layout) for the full tree.

## Deployment

CleanCollect is a long-lived Node process (Express + Server-Sent Events + a
JSON-file database). It needs a host that supports **stateful** services —
**not** Vercel-style serverless functions, where each request is a fresh
container, the filesystem is read-only, and SSE connections are killed by
request timeouts. That is why the Vercel build fails to run.

The bundled `render.yaml` gives you a one-click deploy on Render:

1. Push the repo to GitHub.
2. Open https://render.com/deploy and paste the repo URL (or click
   "New Blueprint" after connecting the repo).
3. Render reads `render.yaml`, creates the web service, mounts a 1 GB disk at
   `/var/data`, generates a strong `AUTH_TOKEN_SECRET`, and starts the app.
4. The first request to `/api/health` returns `200 { status: "ok" }`. Done.

Equivalent one-shot deploys are configured for:

- **Railway** — `railway.toml` (set `DATA_DIR=/var/data` and mount a volume in
  the dashboard).
- **Fly.io** — `fly.toml` + `Dockerfile` (creates a `cleancollect_data` volume
  at `/var/data` automatically).
- **Any VPS / Docker host** — `docker run -p 3000:3000
  -v cleancollect-data:/var/data cleancollect`.

### Environment variables (production)

| Variable            | Purpose                                                                 |
|---------------------|-------------------------------------------------------------------------|
| `PORT`              | Port the Node process listens on. Default `3000`.                       |
| `HOST`              | Bind address. Default `0.0.0.0`.                                       |
| `DATA_DIR`          | Directory for `db.json`. Default `<cwd>/data`. **Must be a persistent path on Render/Fly/Railway (e.g. `/var/data`).** |
| `AUTH_TOKEN_SECRET` | HMAC secret for auth tokens. Generate per environment; never reuse.     |
| `FRONTEND_ORIGIN`   | CORS allow-list. The deploy URL is auto-included via "own host" detection in `createApp()`. |
| `GEMINI_API_KEY`    | Optional. Only used if you wire Gemini helpers into the app.            |

### Build & run by hand

```bash
npm install
npm run build      # vite build (client) + esbuild server.prod.ts -> dist/server.cjs
DATA_DIR=/var/data npm start
```

### Verifying persistence after deploy

`GET /api/admin/db-info` returns the absolute DB path and the live record
counts. `dataDir` should match the mounted volume path; `sizeBytes` should
grow as you create records.

## License

Internal demo / reference project. Replace with your own LICENSE before
shipping.
