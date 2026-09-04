# CleanCollect — Smart Waste Management Platform

> A national, role-based waste-management platform for Ghana — from on-demand
> household pickup to live truck tracking, driver dispatch, route optimization,
> billing, and nationwide operations analytics.

CleanCollect is a single-page React 19 + TypeScript app paired with an Express
JSON API. Both run from the same Node process in dev (`tsx server.ts`) and the
same bundled CJS entry in production (`node dist/server.cjs`), so there is one
port, one CORS policy, and one health check.

---

## 1. Project goals

- **Unified customer experience** — request, pay for, and track a waste pickup
  on a map in real time.
- **Driver operations** — receive assigned jobs, follow an optimized route, and
  push live GPS updates to dispatch and the customer.
- **National oversight** — give administrators a live view of every truck,
  region, and revenue line across all 16 Ghana regions.
- **Operate on the edge of the country** — every depot, landfill, and region is
  modelled with real lat/lng coordinates and routing distances.

---

## 2. Tech stack

| Layer            | Choice                                            |
|------------------|---------------------------------------------------|
| Front-end        | React 19 + TypeScript (SPA)                       |
| Build / dev      | Vite 6 (`@vitejs/plugin-react`)                   |
| Styling          | Tailwind CSS v4 (`@tailwindcss/vite`, `@import "tailwindcss"`) |
| Charts           | Recharts 3                                        |
| Icons            | lucide-react                                      |
| Animation        | motion (Framer-Motion successor)                  |
| Maps             | Leaflet 1.9 (OSM tiles, dark-mode filter)         |
| Confetti         | canvas-confetti                                   |
| Server           | Express 4                                         |
| Validation       | zod 3                                             |
| Auth crypto      | Node `crypto` (scrypt + HMAC-SHA256)              |
| Persistence      | JSON file (`data/db.json`, atomic write)          |
| Real-time        | Server-Sent Events (`/api/stream`)                |
| AI integration   | `@google/genai` (Gemini — optional)               |
| Runtime          | Node 22+, ESM (`"type": "module"`)                |
| TS runner        | `tsx` (dev), `esbuild` → CJS (prod)               |

---

## 3. Quick start

```powershell
# Windows / PowerShell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
npm install
copy .env.example .env       # optional: edit GEMINI_API_KEY
npm run dev
# -> http://localhost:3000
```

The dev command boots a single process that serves **both** the Vite SPA
(with HMR) **and** the JSON API under `/api/*`. Open the URL in your browser —
no second process, no second port.

### Build & serve in production

```bash
npm run build
npm start            # node dist/server.cjs
```

`npm run build` runs `vite build` (client bundle → `dist/assets/*`) and
`esbuild backend/server.ts` → `dist/server.cjs` (server bundle with
`--packages=external` so it loads the production `node_modules` directly).

### Type / lint

```bash
npm run lint         # tsc --noEmit
```

---

## 4. Environment variables

Defined in `.env` (see `.env.example`):

| Variable            | Purpose                                                |
|---------------------|--------------------------------------------------------|
| `PORT`              | Server port. Default `3000`.                           |
| `HOST`              | Bind address. Default `0.0.0.0`.                       |
| `FRONTEND_ORIGIN`   | Comma-separated CORS allow-list. Default covers `:5173` and `:3000`. |
| `GEMINI_API_KEY`    | Optional. Used by AI helpers.                          |
| `APP_URL`           | Optional. Self-referential link helper.                |
| `AUTH_TOKEN_SECRET` | Optional. HMAC secret for auth tokens; defaults to a dev placeholder. **Set in production.** |
| `DISABLE_HMR`       | `true` to disable Vite HMR (e.g. in containerized dev). |

The server also computes the "own host" set (`http://{host}:{port}` for
`localhost`, `127.0.0.1`, `0.0.0.0`) and adds it to the CORS allow-list, so
same-origin requests always pass — important because the unified dev server
serves both UI and API from the same origin.

---

## 5. Architecture overview

```
┌────────────────────── Browser (SPA, React 19) ──────────────────────┐
│  App.tsx                                                               │
│  ├── <AuthProvider>      user, role, notifications, modals            │
│  ├── <ThemeProvider>     light / dark + localStorage                  │
│  ├── <StreamProvider>    EventSource → /api/stream (SSE)             │
│  └── <Toast> / Navbar / AuthModal / CustomerPortal / DriverPortal …   │
└─────────────────────────────┬─────────────────────────────────────────┘
                              │  fetch + EventSource  (same origin)
┌─────────────────────────────▼─────────────────────────────────────────┐
│ Express app (createApp in backend/server.ts)                          │
│                                                                       │
│  /api/auth/*              login, register, apply-driver, me           │
│  /api/collections/*       list, calculate, create, assign, complete  │
│  /api/driver/collections  start, complete, fail, location (GPS push) │
│  /api/driver-applications list / get / review (approve|reject)       │
│  /api/admin/*             dashboard, customers, drivers, trucks,      │
│                           payments, pricing, db-info, create-admin    │
│  /api/notifications       list, mark-read, mark-all-read             │
│  /api/route/optimize      nearest-neighbor + 2-opt                   │
│  /api/regions             16 Ghana regions, depots, landfills         │
│  /api/saas-plans          Basic / Business / Enterprise              │
│  /api/stream              SSE: driver-location, collection-status, … │
│  /api/seed/reset          reset DB to demo state                     │
│  /api/health              liveness probe                              │
└─────────────────────────────┬─────────────────────────────────────────┘
                              │
                  ┌───────────▼────────────┐
                  │  Database (db.ts)      │
                  │  ─ Proxy-wrapped arrays│
                  │  ─ Atomic write        │
                  │  ─ Scrypt password hash│
                  │  data/db.json          │
                  └────────────────────────┘
```

In dev, the Express app is created inside `server.ts` (a 30-line Vite middleware
shim) so React HMR and the API share the same port. In production,
`dist/server.cjs` calls `createApp()` directly and serves `dist/` as static
files (the static-serving step is added at deploy time — see "Deployment"
below).

---

## 6. Project layout

```
.
├── server.ts                   # dev: Vite + API on one port
├── backend/
│   ├── server.ts               # createApp() — all Express routes
│   ├── auth.ts                 # scrypt + HMAC tokens + rate limit
│   ├── schemas.ts              # zod validation per route
│   └── db.ts                   # JSON-file DB + route optimization
├── src/
│   ├── App.tsx                 # provider tree + portal router
│   ├── main.tsx                # React entrypoint
│   ├── types.ts                # shared TypeScript types
│   ├── index.css               # Tailwind v4, dark mode, input defaults
│   ├── components/
│   │   ├── Navbar.tsx          # role switcher, theme, live status
│   │   ├── AuthModal.tsx       # sign-in / sign-up / apply-driver
│   │   ├── CustomerPortal.tsx  # request, track, rate, pay
│   │   ├── DriverPortal.tsx    # jobs, route, GPS simulator
│   │   ├── AdminPortal.tsx     # fleet, applications, analytics
│   │   ├── ReceiptModal.tsx    # payment receipts
│   │   └── LeafletMap.tsx      # shared map + geolocation pulse
│   ├── context/
│   │   ├── AuthContext.tsx     # user, role, modals, URL sync
│   │   ├── StreamContext.tsx   # SSE bridge to React
│   │   └── ThemeContext.tsx    # light / dark persistence
│   ├── hooks/
│   │   └── useGeolocation.ts   # navigator.geolocation + Ghana bounds
│   └── data/
│       └── ghanaRegions.ts     # 16 regions, depots, landfills
├── data/
│   └── db.json                 # auto-created on first run
├── docs/
│   ├── PROJECT.md              # ← you are here
│   └── API.md                  # endpoint-by-endpoint reference
├── index.html                  # Vite entry
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

---

## 7. Front-end tour

### `App.tsx`
Wraps the app in `<AuthProvider>`, `<ThemeProvider>`, `<StreamProvider>` and
routes between the **Customer**, **Driver**, and **Admin** portals based on
`currentRole`. Renders the global `<AuthModal />`, the toast overlay, and the
top-level `<Navbar />`.

### `context/AuthContext.tsx`
- Holds `currentUser`, `currentRole`, `allUsers`, `notifications`, and
  `driverApplications`.
- Exposes `login`, `registerCustomer`, `applyDriver`, `reviewDriverApplication`,
  `createAdmin`, `switchRole`, `switchUser`, `logout`.
- Modal state is **synchronized with the URL** (`?auth=signin|signup|apply`)
  via `pushState` on open and a `popstate` listener for back/forward navigation.
- Polls notifications and applications every 8 s for the current user.

### `context/StreamContext.tsx`
- Opens `new EventSource('/api/stream')` and dispatches `driver-location`,
  `collection-status`, and `ping` events into React state.
- `pushDriverLocation(driverId, lat, lng)` is the **client-to-server** half:
  the driver simulator calls it to push GPS to the API, which then re-broadcasts
  via SSE so every viewer (customer + admin) sees the live pin.

### `context/ThemeContext.tsx`
- Persists the user's choice to `localStorage` and falls back to
  `prefers-color-scheme`.
- Applies the `.dark` class to `<html>` and sets `color-scheme` so native
  scrollbars / form controls adapt.

### `components/Navbar.tsx`
Brand, role switcher, theme toggle (sun/moon), live status pill (`Live` /
`Offline` driven by `useStream().connected`), and user menu.

### `components/AuthModal.tsx`
- Three modes: **Sign in**, **Register as Customer**, **Apply to drive**.
- All forms use globally-styled inputs (`text-sm bg-white dark:bg-slate-800
  text-slate-900 dark:text-slate-100 placeholder:text-slate-400`) with explicit
  light/dark contrast so typed text is always readable.

### `components/CustomerPortal.tsx`
- Booking form with live pricing (`/api/collections/calculate-price`).
- Tracking view: live Leaflet map of the assigned truck + a "Call driver" tel:
  link that appears the moment a job leaves `pending`.
- History, receipts, ratings, notifications.

### `components/DriverPortal.tsx`
- Job cards with start / complete / fail actions.
- **GPS simulator**: when a job is `in_progress`, the portal nudges the truck
  3 m every 3 s along the bearing toward the customer and calls
  `pushDriverLocation` — admins and customers see the pin move in real time.
- Route optimization panel (`/api/route/optimize`).

### `components/AdminPortal.tsx`
- National dashboard with KPIs, Recharts trend lines, regional distribution.
- Driver-application review (approve → auto-creates a `User` + `Driver` profile
  and assigns an idle truck).
- Customer, driver, truck, payment, pricing, and notification tables.
- "Reset demo data" button calls `/api/seed/reset`.

### `components/LeafletMap.tsx`
- Shared map component: tiles + dark-mode filter + the pulsing
  "you are here" marker + a `Crosshair` "Locate me" button that calls
  `useGeolocation().request()`.
- Accepts `pickupLocation` and `driverLocation` props; when both are present it
  auto-fits the bounds.

### `hooks/useGeolocation.ts`
- Wraps `navigator.geolocation.getCurrentPosition`.
- Validates the fix against Ghana's bounding box; if the device reports a
  position outside Ghana (e.g. emulator with no GPS), or geolocation is
  unavailable, it returns the **Accra fallback** (5.6037, -0.187) and surfaces
  a human-readable error.

---

## 8. Back-end tour

### `backend/server.ts` — `createApp()`
The Express app. All routes are mounted at the top level; **when mounted under
Vite middleware (dev) the `/api` prefix is preserved by the caller**, and in
prod the build wrapper serves the same router at the same prefix.

The most important pieces of middleware:

- **CORS** — allow-list comes from `FRONTEND_ORIGIN` plus the dynamic
  "own host" set. Same-origin requests never need the header.
- **JSON body** parser.
- **Persistence hook** — on every non-GET response, `db.persist()` is called
  on `res.on('finish')`. The DB is dirty only when in-memory arrays actually
  changed, so cost is one `fs.stat` per write cycle.

Endpoint highlights:

| Route                                 | Notes                                  |
|---------------------------------------|----------------------------------------|
| `POST /api/auth/login`                | Rate-limited 10/min/IP, scrypt verify, returns signed token. |
| `POST /api/auth/register-customer`    | Self-service signup, auto-creates a notification. |
| `POST /api/auth/apply-driver`         | Creates a `DriverApplication` (status `pending`); admin must approve. |
| `GET /api/auth/me?role=&userId=`      | Demo helper used by `AuthContext` to load the active profile. |
| `POST /api/collections/calculate-price` | Pricing engine preview (does not persist). |
| `POST /api/collections`               | New request → pricing, payment record, SSE `collection-status` event. |
| `PUT /api/collections/:id/assign`     | Admin dispatch: driver + truck.       |
| `PUT /api/driver/collections/:id/start`   | Status `in_progress`.                |
| `PUT /api/driver/collections/:id/complete` | Marks completed, bumps driver stats & truck load. |
| `PUT /api/driver/collections/:id/report-failed` | Captures failure reason.         |
| `POST /api/ratings`                   | Customer feedback, updates driver rating. |
| `GET  /api/route/optimize?driverId=`  | Nearest-neighbor + 2-opt, returns stops + fuel/CO₂ savings. |
| `GET  /api/admin/dashboard`           | KPIs for charts on the admin portal.  |
| `GET  /api/admin/customers|drivers|trucks|payments` | Tabular admin views.   |
| `GET/PUT /api/admin/pricing`          | Get or patch the `PricingRule`.       |
| `POST /api/driver-applications/:id/review` | Approve → creates `User` + `Driver` + truck assignment. |
| `POST /api/admin/create-admin`        | Only callable by another admin.       |
| `GET  /api/notifications?userId=&role=` | List notifications for a user.      |
| `PUT  /api/notifications/:id/read`    | Mark one read.                        |
| `PUT  /api/notifications/mark-all-read` | Mark all read.                       |
| `GET  /api/regions`                   | All 16 regions, depots, landfills.    |
| `GET  /api/saas-plans`                | Static plans (Basic / Business / Enterprise). |
| `POST /api/driver/location`           | GPS push from driver; publishes `driver-location` to SSE. |
| `GET  /api/stream`                    | **SSE**: replays last known driver positions, then live events; 25 s ping. |
| `GET  /api/admin/db-info`             | DB path, size, record counts.         |
| `POST /api/seed/reset`                | Re-seed the in-memory DB and persist. |
| `GET  /api/health`                    | `{ status, service, time }`.          |

### `backend/auth.ts`
- `hashPassword` / `verifyPassword` use `crypto.scryptSync` with a 16-byte
  random salt. Stored format: `scrypt$<saltHex>$<derivedHex>`. Comparison uses
  `crypto.timingSafeEqual`. Legacy plaintext demo passwords still match (one
  time) and are auto-migrated to scrypt on next load.
- `signToken` / `verifyToken` produce a `base64url(body).base64url(hmac)` token
  with a 7-day expiry.
- `rateLimit` is a tiny in-memory token bucket keyed by an arbitrary string
  (e.g. `login:<ip>`).

### `backend/schemas.ts`
Zod schemas for every request body. `validate(schema)` returns Express
middleware that 400s with structured `issues` on failure and assigns the
parsed object back to `req.body`.

### `backend/db.ts` — `Database`
- Proxy-wrapped arrays (`observableArray` / `observableObject`) flip a `dirty`
  flag on any mutation. Persistence is a one-line call.
- Constructor: load `data/db.json` if present, else `seed()` and persist.
- `migrateLegacyPasswords()` runs after load.
- `calculatePricing(wasteType, quantity, unit, urgency, lat, lng)` uses
  `getNearestGhanaDepot` + `calculateDistanceKm` (Haversine) to compute
  base + volume + distance + express surcharge + VAT.
- `optimizeDriverRoute(driverId)` is a **nearest-neighbor heuristic with
  express-job bias** (×0.75 distance weight) and reports simulated savings
  vs. an unoptimized 1.38× baseline.

---

## 9. Persistence model

The DB lives in **`data/db.json`** at the project root.

- `users`, `collections`, `drivers`, `trucks`, `payments`, `notifications`,
  `driverApplications` are arrays of typed records.
- `pricingRules` is a single object.
- Writes are **atomic**: `fs.writeFileSync(db.json.tmp)` →
  `fs.renameSync(db.json.tmp, db.json)`. A crashed process never leaves a
  half-written file.
- The `dirty` flag short-circuits writes when nothing changed, so the
  `res.on('finish')` hook in the API is free on read-heavy workloads.
- `GET /api/admin/db-info` returns the path, size, and record counts so you
  can verify persistence at a glance.
- To reset to the bundled demo state: `POST /api/seed/reset` or
  `AuthContext.resetDatabase()` from the admin portal.

> **Production note:** for multi-instance deployments, swap the JSON backend
> for a real database. The `Database` class is the only abstraction that
> needs replacing — the API and components are agnostic to it.

---

## 10. Real-time model (SSE)

```
Driver GPS push             Customer / Admin viewers
   │                              ▲
   ▼                              │
POST /api/driver/location    GET /api/stream (SSE)
   │                              ▲
   └──► publish() ─► bus ─► event listeners ─► res.write()
```

- `POST /api/driver/location` is the **only** inbound channel — both real
  device GPS and the in-app simulator go through it.
- `GET /api/stream` is the **only** outbound channel — one persistent
  connection per viewer; server pushes:
  - `event: driver-location` (every push)
  - `event: collection-status` (when a status changes)
  - `event: notification` (reserved for future use)
  - `event: ping` (every 25 s, keeps proxies honest)
- `StreamContext` is the React bridge: it opens the SSE on mount, splits
  events by type, and exposes `drivers`, `statuses`, `connected`, and
  `pushDriverLocation`.

This design is intentionally one-way and lightweight — it works behind every
proxy that supports streaming (Cloud Run, Nginx, Vercel, etc.) and avoids the
overhead of a full WebSocket stack.

---

## 11. Auth & security

- **Passwords**: scrypt + 16-byte salt + 64-byte derived key. `timingSafeEqual`
  on compare. Legacy plaintext demo passwords are auto-migrated on next load.
- **Sessions**: stateless HMAC-SHA256 tokens with 7-day expiry. There is no
  session store to invalidate; for a production deployment with revocation
  needs, add a `jti` claim and a Redis deny-list.
- **Login rate limiting**: 10 attempts / minute / IP, in-memory token bucket.
- **CORS**: allow-list is `FRONTEND_ORIGIN` ∪ the API's own `host:port` set.
  Any other origin is rejected with a CORS error.
- **Validation**: every write route is wrapped in a zod `validate(...)`
  middleware that returns 400 with field-level `issues`.
- **No secrets in code**: `GEMINI_API_KEY` and `AUTH_TOKEN_SECRET` are
  environment variables; the dev default for the token secret is clearly
  marked and warns you to override it in production.
- **Production hardening checklist** (deliberately out of scope for this
  demo): set `AUTH_TOKEN_SECRET`, front the app with TLS, replace the JSON DB
  with Postgres / SQLite, and put the rate limiter on Redis.

---

## 12. Theming & accessibility

- Tailwind v4 with `@custom-variant dark (&:where(.dark, .dark *))` so
  `dark:` modifiers work the moment `<html class="dark">` is set.
- The theme is persisted to `localStorage` and respects
  `prefers-color-scheme` on first load.
- Leaflet tiles get an `invert(0.92) hue-rotate(180deg)` filter in dark mode
  so the same OSM tiles work in both themes.
- All inputs share explicit `text-slate-900 dark:text-slate-100` + placeholder
  + caret colors, so typed values are always readable.
- Form focus rings are emerald at 3 px with 15% alpha.
- Toast, modal, and dropdown UI uses `aria` attributes where appropriate;
  the focus trap and `Esc`-to-close in `AuthModal` are first-class.
- Reduced-motion users are respected via Tailwind's `motion-reduce:` variants
  and the `motion` library's reduced-motion default.

---

## 13. Deployment

1. `npm run build` — bundles the SPA into `dist/assets/*` and the server into
   `dist/server.cjs`.
2. Add a `dist`-aware static middleware to `createApp()` (a 4-line addition
   when you are ready to ship — the dev path through Vite middleware does this
   for you in dev).
3. Run with `npm start` (or `node dist/server.cjs`) behind your reverse proxy
   of choice. Make sure your proxy **buffers no SSE responses** and forwards
   `Cache-Control: no-cache`.
4. Set `AUTH_TOKEN_SECRET` and `GEMINI_API_KEY` in the environment.
5. Mount a writable volume at `./data` so `db.json` survives restarts.

Containerized layout (sketch):

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.cjs"]
```

---

## 14. Troubleshooting

| Symptom                                            | Likely cause / fix                                                    |
|----------------------------------------------------|-----------------------------------------------------------------------|
| Browser shows "CORS blocked origin"               | Your dev URL isn't in `FRONTEND_ORIGIN`; the dev server runs on `:3000` (not `:5173`) by default. |
| `npm.ps1 cannot be loaded`                         | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` before `npm`. |
| `node` not found                                   | Use the absolute path or add `C:\Program Files\nodejs` to `PATH`.     |
| Forms typed in white on white                      | Should not happen post-fix; verify `src/index.css` global input rules shipped and the element has `<input>`/`<select>`/`<textarea>`. |
| Live map never updates                             | `useStream().connected` is `false` — check `/api/stream` in the network tab; usually a proxy killing the SSE. |
| Resetting doesn't clear notifications              | Notifications live in the same `data/db.json`; `POST /api/seed/reset` clears them. |
| "Database not writable" on prod                    | Mount a writable volume at `./data`.                                  |

---

## 15. License

Internal demo / reference project. Replace with your own LICENSE before
shipping.
