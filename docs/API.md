# CleanCollect — API Reference

> All endpoints are JSON over HTTP, served from the same origin as the SPA.
> In dev: `http://localhost:3000/api/*`. In prod: same host, prefixed with
> `/api`.

## Conventions

- **Content type** — requests and responses are `application/json` unless
  noted.
- **Authentication** — most endpoints are open in the demo. The login endpoint
  returns a `token` (HMAC-SHA256, 7-day expiry). Production should send it
  as `Authorization: Bearer <token>`.
- **Validation** — every write route is wrapped in a zod schema; malformed
  bodies return `400` with `{ error, issues: [{ path, message }] }`.
- **Persistence** — every non-`GET` request that mutates state writes
  `data/db.json` on response finish.
- **Real-time** — `GET /api/stream` is the Server-Sent Events channel; see
  [§ Events](#events).

## Common response shapes

```ts
// success
{ "data": ..., "message"?: "..." }      // varies per route
{ "user": User, "token": "...", "role": "customer" }   // auth routes

// error
{ "error": "Human-readable message", "issues"?: [{ path, message }] }
```

---

## Endpoints

### Health & meta

#### `GET /api/health`
Liveness probe.

```json
{ "status": "ok", "service": "CleanCollect Waste Management API", "time": "2026-09-03T00:00:00.000Z" }
```

#### `GET /api/admin/db-info`
Returns the persistent DB path, size, and live record counts.

```json
{
  "persistent": true,
  "path": "data/db.json",
  "sizeBytes": 12345,
  "recordCounts": { "users": 4, "collections": 6, "drivers": 1, "trucks": 4, "payments": 5, "notifications": 3, "driverApplications": 3 }
}
```

---

### Auth

#### `GET /api/auth/me?role=customer&userId=usr-cust-01`
Demo helper: returns the active profile and the full user list. `userId` is
optional; if absent, the first user matching `role` is returned.

```json
{ "user": { ...User }, "allUsers": [ ...User ] }
```

#### `POST /api/auth/login`
Rate-limited **10/min/IP**.

Body:
```json
{ "identifier": "kwame@example.com", "password": "password123" }
```
Either `identifier` or `email` is accepted; both are normalized to lower-case
and matched against `email`, `name`, or `id` exactly. If a `role` is supplied
and the lookup fails, the first user of that role is returned (demo switch).

Possible failures:

- `429` — rate limit hit (`Retry-After` header set).
- `403` — applicant is `pending` / `rejected` (with `applicationStatus`).
- `401` — unknown identifier or wrong password.

Success:
```json
{ "token": "<signed>", "user": { ... }, "role": "customer", "message": "..." }
```

#### `POST /api/auth/register-customer`
Body (zod-validated):
```json
{
  "name": "Esi Mensah", "email": "esi@example.com", "phone": "+233 24 000 1111",
  "password": "secret123", "address": "Accra", "regionId": "greater_accra",
  "area": "East Legon", "lat": 5.63, "lng": -0.16
}
```
Returns `201` with `{ user, token, role, message }`. Creates a welcome
notification and persists.

#### `POST /api/auth/apply-driver`
Body (zod-validated):
```json
{
  "fullName": "Kwame Asante", "email": "k@example.com", "phone": "+233 24 991 2233",
  "ghanaCardNumber": "GHA-829104812-3", "licenseNumber": "GH-DL-82910-D",
  "licenseClass": "Class D (Heavy Goods & Tanker)", "yearsExperience": 6,
  "preferredRegionId": "ashanti", "residentialAddress": "Asokwa, Kumasi",
  "emergencyContact": { "name": "Abena", "phone": "+233 24 991 2234", "relationship": "Spouse" },
  "hasHeavyHaulageCert": true, "notes": "6 years on hydraulic compactors."
}
```
Returns `201` with `{ success, application, message }`. The application
status starts as `pending`; the admin must approve or reject before a `User`
account is provisioned.

#### `POST /api/admin/create-admin`
Body (zod-validated). **Requires** `creatorRole: "admin"`.
```json
{ "name": "...", "email": "...", "phone": "...", "password": "...", "address": "...", "creatorRole": "admin" }
```
Returns `201` with `{ success, message, user }`.

---

### Driver applications

#### `GET /api/driver-applications?status=pending&region=ashanti`
List applications. `status` and `region` accept `all`.

```json
{ "applications": [ ... ], "totalCount": 3, "pendingCount": 2, "approvedCount": 1 }
```

#### `GET /api/driver-applications/:id`
Single application. `404` if not found.

#### `POST /api/driver-applications/:id/review`
Body:
```json
{ "action": "approve", "assignedTruckId": "trk-02", "reviewerName": "Akua Addo" }
```
or
```json
{ "action": "reject", "rejectionReason": "License class did not pass", "reviewerName": "Akua Addo" }
```
On `approve`: creates a `User` (role `driver`), a `Driver` profile, assigns an
idle truck, fires two notifications, and persists. Returns `{ success,
message, application, driverUser, driverProfile }`.

---

### Regions & pricing

#### `GET /api/regions`
```json
{
  "regions": [ ...16 Ghana regions with capital, center, depot, landfill ],
  "totalRegions": 16,
  "nationalDepots": [ ... ],
  "nationalLandfills": [ ... ]
}
```

#### `POST /api/collections/calculate-price`
Body (all fields optional — server substitutes defaults):
```json
{ "wasteType": "organic", "quantity": 8, "quantityUnit": "bins", "urgency": "express", "lat": 5.6395, "lng": -0.1582 }
```
Returns the full pricing breakdown:
```json
{ "baseFee": 25, "wasteTypeRate": 35, "volumeFee": 280, "distanceFee": 28, "urgencySurcharge": 166.5, "subtotal": 499.5, "tax": 24.98, "totalGHS": 524.48 }
```

#### `GET /api/admin/pricing`
#### `PUT /api/admin/pricing`
```json
{ "baseFeeGHS": 30, "distanceRatePerKm": 4, "expressMultiplier": 1.5, "vatRatePct": 5 }
```
Partial updates are merged.

---

### Collections

#### `GET /api/collections?status=&customerId=&driverId=&wasteType=&region=`
Returns an array. Filters compose; `status` and `wasteType` and `region` accept
`all`.

#### `GET /api/collections/:id`
Single request. `404` if missing.

#### `POST /api/collections`
Body (zod-validated, `.passthrough()` — extra fields preserved):
```json
{
  "customerId": "usr-cust-01", "customerName": "Kwame Mensah", "customerPhone": "+233 ...",
  "wasteType": "organic", "quantity": 8, "quantityUnit": "bins", "estimatedWeightKg": 450,
  "location": { "address": "...", "area": "East Legon", "lat": 5.6395, "lng": -0.1582 },
  "preferredDate": "2026-09-10", "preferredTimeSlot": "11:30 - 13:30",
  "urgency": "express", "specialInstructions": "Seal bags tightly.", "paymentMethod": "momo"
}
```
Returns `201` with the created request, generates a `PaymentRecord` when not
`cash`, an admin notification, and emits a `collection-status` SSE event.

#### `PUT /api/collections/:id/cancel`
Body: `{ "reason": "..." }`. Sets `status: cancelled`, adds an admin
notification, emits SSE.

#### `PUT /api/collections/:id/assign`
Body:
```json
{ "driverId": "usr-drv-01", "truckId": "trk-01" }
```
Sets `status: assigned`, fills `assignedDriverId/Name/Phone/TruckId/Plate`,
emits SSE, and notifies both the driver and the customer.

#### `PUT /api/driver/collections/:id/start`
Sets `status: in_progress`, fills `startedAt`, notifies the customer, emits
SSE.

#### `PUT /api/driver/collections/:id/complete`
Body (zod-validated):
```json
{ "completedWeightKg": 462, "proofPhotoUrl": "https://...", "notes": "All clear" }
```
Sets `status: completed`, bumps driver `completedTrips` and decrements
`activeTasksCount`, increments truck `currentLoadKg`, requests a rating
notification, emits SSE.

#### `PUT /api/driver/collections/:id/report-failed`
Body (zod-validated):
```json
{ "failureReason": "Customer not available", "notes": "..." }
```
Sets `status: failed`, notifies the customer, emits SSE.

#### `POST /api/ratings`
Body (zod-validated):
```json
{ "collectionId": "REQ-2026-08101", "rating": 5, "feedback": "Great service!" }
```
Updates `collection.rating` and refreshes the driver rolling average.

---

### Route optimization

#### `GET /api/route/optimize?driverId=usr-drv-01`
Runs nearest-neighbor (express-biased) with start-depot and end-landfill
stops. Returns:
```json
{
  "driverId": "...", "driverName": "...", "truckPlate": "GT-4821-22",
  "totalDistanceKm": 28.3, "estimatedDurationMin": 92,
  "fuelSavedLiters": 3.7, "carbonReducedKg": 9.9,
  "stops": [ { "stopNumber": 1, "type": "depot", "address": "...", "lat": ..., "lng": ..., "estimatedArrival": "08:00 AM" }, ... ],
  "routeCoordinates": [ [lat, lng], ... ]
}
```

---

### Admin views

| Route                              | Returns                                 |
|------------------------------------|------------------------------------------|
| `GET /api/admin/dashboard`         | KPIs, status & category distributions, weekly revenue trend, recent activities. |
| `GET /api/admin/customers`         | Customer list with `totalRequests`, `activeRequests`, `totalSpentGHS`. |
| `GET /api/admin/drivers`           | `Driver[]`.                              |
| `GET /api/admin/trucks`            | `Truck[]`.                               |
| `GET /api/admin/payments`          | `PaymentRecord[]`.                       |

---

### Notifications

| Route                                       | Effect                       |
|---------------------------------------------|------------------------------|
| `GET  /api/notifications?userId=&role=`     | List, filtered by user/role. |
| `PUT  /api/notifications/:id/read`          | Mark one as read.            |
| `PUT  /api/notifications/mark-all-read`     | Mark all as read.            |

---

### Real-time

#### `POST /api/driver/location`
Body (zod-validated):
```json
{ "driverId": "usr-drv-01", "lat": 5.612, "lng": -0.17, "speedKph": 28, "heading": "NE" }
```
Updates the driver's `currentLocation` and **publishes** a
`driver-location` event to all SSE subscribers.

#### `GET /api/stream`
Server-Sent Events. On open, replays the last known position of every driver
then emits a `ping` immediately. After that:

| Event name            | Payload                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| `driver-location`     | `{ driverId, lat, lng, speedKph, heading, timestamp }`                  |
| `collection-status`   | `{ collectionId, status, assignedDriverId? }`                           |
| `notification`        | reserved for future use                                                 |
| `ping`                | `{ timestamp }` (every 25 s)                                            |

A sample `curl` consumer:

```bash
curl -N http://localhost:3000/api/stream
# event: driver-location
# data: {"driverId":"usr-drv-01","lat":5.612,"lng":-0.17,...}
```

---

### SaaS plans

#### `GET /api/saas-plans`
Returns the three plans (`plan-basic`, `plan-business`, `plan-enterprise`).
Static for the demo; in production you'd back this with a billing service.

---

### Demo reset

#### `POST /api/seed/reset`
Re-seeds the in-memory DB to the bundled demo state and persists.

```json
{ "success": true, "message": "Database reset to initial demo state" }
```

---

## Error codes

| Code | When                                                                  |
|------|-----------------------------------------------------------------------|
| 400  | Body failed zod validation. `issues` lists per-field errors.         |
| 401  | Login failed (unknown user or wrong password).                        |
| 403  | Driver applicant is pending or rejected; non-admin tried to create-admin. |
| 404  | Resource not found.                                                   |
| 429  | Rate-limited (`Retry-After` header in seconds).                       |
| 500  | Unexpected server error (see server logs).                            |

---

## Type sketch (abridged)

```ts
type UserRole = 'customer' | 'driver' | 'admin';

interface User {
  id: string; name: string; email: string; phone: string;
  password: string;       // scrypt$<saltHex>$<derivedHex> (legacy plaintext auto-migrated)
  role: UserRole;
  status?: 'active' | 'inactive';
  isDemo?: boolean;
  regionId?: string; regionName?: string;
  address?: string; coordinates?: { lat: number; lng: number };
  avatar?: string; createdAt: string;
  // driver-only:
  ghanaCardNumber?: string; licenseNumber?: string; assignedTruckPlate?: string;
}

type WasteCategory = 'organic' | 'recyclables' | 'electronic' | 'hazardous' | 'general_bulk' | 'construction';
type QuantityUnit = 'bags' | 'bins' | 'kg' | 'truckload';
type Urgency = 'standard' | 'express';
type CollectionStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

interface CollectionRequest {
  id: string;
  customerId: string; customerName: string; customerPhone: string; customerEmail: string;
  wasteType: WasteCategory; quantity: number; quantityUnit: QuantityUnit; estimatedWeightKg: number;
  location: { address: string; landmark?: string; area: string; region?: string; lat: number; lng: number };
  preferredDate: string; preferredTimeSlot: string; urgency: Urgency;
  specialInstructions?: string; status: CollectionStatus;
  pricing: { baseFee: number; wasteTypeRate: number; volumeFee: number; distanceFee: number; urgencySurcharge: number; subtotal: number; tax: number; totalGHS: number };
  assignedDriverId?: string; assignedDriverName?: string; assignedDriverPhone?: string;
  assignedTruckId?: string; assignedTruckPlate?: string;
  paymentStatus: 'paid' | 'unpaid'; paymentMethod?: 'momo' | 'card' | 'cash' | 'bank_transfer';
  paymentReference?: string; completedWeightKg?: number; completionProofPhotoUrl?: string;
  driverNotes?: string; failureReason?: string; cancellationReason?: string;
  rating?: number; feedback?: string;
  timestamps: { createdAt: string; assignedAt?: string; startedAt?: string; completedAt?: string; cancelledAt?: string };
}
```

For the full source of truth see `src/types.ts` and `backend/db.ts`.
