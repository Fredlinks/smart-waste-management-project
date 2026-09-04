import 'dotenv/config';
import express, { Request, Response } from 'express';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { hashPassword, verifyPassword, signToken, rateLimit, clientIp } from './auth';
import {
  validate,
  loginSchema,
  registerCustomerSchema,
  applyDriverSchema,
  reviewDriverSchema,
  createAdminSchema,
  calculatePriceSchema,
  createCollectionSchema,
  cancelCollectionSchema,
  assignCollectionSchema,
  completeCollectionSchema,
  failCollectionSchema,
  ratingSchema,
  updatePricingSchema,
  driverLocationSchema,
} from './schemas';
import cors from 'cors';
import {
  CollectionRequest,
  CollectionStatus,
  Driver,
  PricingRule,
  User,
  WasteCategory,
  DashboardMetrics,
  SaasPlan,
  DriverApplication,
} from '../src/types';
import {
  GHANA_REGIONS,
  getAllGhanaDepots,
  getAllGhanaLandfills,
} from '../src/data/ghanaRegions';
import { Database } from './db';

const db = new Database();

function cryptoRandomPassword(): string {
  return crypto.randomBytes(18).toString('base64url');
}

// Real-time event bus (SSE)
const bus = new EventEmitter();
bus.setMaxListeners(0);
export type BusEvent =
  | { type: 'driver-location'; driverId: string; lat: number; lng: number; speedKph: number; heading: string; timestamp: string }
  | { type: 'collection-status'; collectionId: string; status: string; assignedDriverId?: string }
  | { type: 'notification'; userId: string; role: string; notification: unknown }
  | { type: 'ping'; timestamp: string };
function publish(evt: BusEvent) {
  bus.emit('event', evt);
}

export function createApp(): express.Express {
  const app = express();

  const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Compute a list of hostnames the API itself runs on, so same-origin requests always pass
  const ownHosts = new Set<string>();
  const port = Number(process.env.PORT) || 3000;
  for (const host of ['localhost', '127.0.0.1', '0.0.0.0']) {
    ownHosts.add(`http://${host}:${port}`);
  }
  for (const o of allowedOrigins) ownHosts.add(o);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || ownHosts.has(origin) || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked origin: ${origin}`));
      },
    })
  );
  app.use(express.json());

  // Persist DB after any state-mutating request finishes (no-op when not dirty)
  app.use((req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    res.on('finish', () => db.persist());
    next();
  });

  // ----------------------------------------------------
  // REST API Endpoints
  // ----------------------------------------------------

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'CleanCollect Waste Management API', time: new Date().toISOString() });
  });

  // Auth: Get Current User or Demo Switch
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const role = (req.query.role as string) || 'customer';
    const userId = req.query.userId as string;
    let user = userId ? db.users.find((u) => u.id === userId) : null;
    if (!user) {
      user = db.users.find((u) => u.role === role) || db.users[0];
    }
    res.json({ user, allUsers: db.users });
  });

  // Auth: Unified Login (Email/Username + Password -> Authenticates & Determines Role)
  app.post('/api/auth/login', validate(loginSchema), (req: Request, res: Response) => {
    const ipKey = `login:${clientIp(req)}`;
    const rl = rateLimit({ key: ipKey, limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfter));
      return res.status(429).json({ error: 'Too many login attempts. Please wait a moment.' });
    }

    const { identifier, email, password, role } = req.body as {
      identifier?: string;
      email?: string;
      password?: string;
      role?: 'customer' | 'driver' | 'admin';
    };
    const loginKey = (identifier || email || '').trim().toLowerCase();

    // 1. Look up by exact email, name, or id (no permissive prefix matching)
    let user = db.users.find((u) => {
      if (!loginKey) return false;
      return (
        u.email.toLowerCase() === loginKey ||
        u.name.toLowerCase() === loginKey ||
        u.id.toLowerCase() === loginKey
      );
    });

    // If role is explicitly requested for demo switching, fall back to first user of that role
    if (!user && role) {
      user = db.users.find((u) => u.role === role);
    }

    // 2. If user not found, check if this is a driver applicant with a pending or rejected application
    if (!user && loginKey) {
      const application = db.driverApplications.find(
        (a) => a.email.toLowerCase() === loginKey || a.fullName.toLowerCase() === loginKey
      );
      if (application) {
        if (application.status === 'pending' || application.status === 'under_review') {
          return res.status(403).json({
            error: 'Your driver application is currently UNDER REVIEW by CleanCollect Fleet Administration. You cannot log in until your credentials are approved by an Administrator.',
            applicationStatus: 'pending',
            applicationId: application.id,
          });
        } else if (application.status === 'rejected') {
          return res.status(403).json({
            error: `Your driver application (${application.id}) was not approved. Reason: ${application.rejectionReason || 'Commercial criteria not met'}.`,
            applicationStatus: 'rejected',
            applicationId: application.id,
          });
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials. No registered user found matching this email or username.',
      });
    }

    // 3. Password Verification (scrypt; falls back to legacy plaintext compare for old data)
    if (password && password.trim() !== '') {
      const entered = password.trim();
      if (user.password && !verifyPassword(entered, user.password)) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
      }
    }

    const token = signToken(user.id, user.role);
    res.json({
      token,
      user,
      role: user.role,
      message: `Successfully authenticated as ${user.name} (${user.role.toUpperCase()})`,
    });
  });

  // Auth: Customer Registration ("Register as Customer")
  app.post('/api/auth/register-customer', validate(registerCustomerSchema), (req: Request, res: Response) => {
    const { name, email, phone, password, address, regionId, regionName, area, lat, lng } = req.body as {
      name: string;
      email: string;
      phone?: string;
      password?: string;
      address?: string;
      regionId?: string;
      regionName?: string;
      area?: string;
      lat?: number;
      lng?: number;
    };

    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({
        error: 'An account with this email address already exists. Please log in directly.',
      });
    }

    const regObj = GHANA_REGIONS.find((r) => r.id === regionId) || GHANA_REGIONS[0];
    const userLat = lat ?? regObj.center[0];
    const userLng = lng ?? regObj.center[1];

    const newCustomer: User = {
      id: `usr-cust-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone || '+233 20 000 0000',
      password: hashPassword(password || cryptoRandomPassword()),
      isDemo: false,
      role: 'customer',
      status: 'active',
      avatar: `https://images.unsplash.com/photo-${1535713875002 + (db.users.length % 5)}?w=150&auto=format&fit=crop&q=80`,
      address: address || `${area || regObj.capital}, ${regObj.name}`,
      regionId: regObj.id,
      regionName: regObj.name,
      coordinates: { lat: userLat, lng: userLng },
      createdAt: new Date().toISOString(),
    };

    db.users.push(newCustomer);

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: newCustomer.id,
      role: 'customer',
      title: 'Welcome to CLEANCollect!',
      message: `Account activated for ${newCustomer.name}. You can now schedule waste pickups, track live collection trucks, and manage your environmental impact in ${regObj.name} Region.`,
      type: 'success',
      read: false,
      timestamp: new Date().toISOString(),
    });

    const token = signToken(newCustomer.id, 'customer');
    res.status(201).json({
      user: newCustomer,
      token,
      role: 'customer',
      message: 'Customer account registered successfully!',
    });
  });

  // Auth: Driver Application ("Apply to become a Driver")
  app.post('/api/auth/apply-driver', validate(applyDriverSchema), (req: Request, res: Response) => {
    const {
      fullName,
      email,
      phone,
      ghanaCardNumber,
      licenseNumber,
      licenseClass,
      yearsExperience,
      preferredRegionId,
      residentialAddress,
      emergencyContact,
      hasHeavyHaulageCert,
      notes,
    } = req.body as {
      fullName: string;
      email: string;
      phone: string;
      ghanaCardNumber: string;
      licenseNumber: string;
      licenseClass?: string;
      yearsExperience?: number;
      preferredRegionId?: string;
      residentialAddress?: string;
      emergencyContact?: { name: string; phone: string; relationship: string };
      hasHeavyHaulageCert?: boolean;
      notes?: string;
    };

    const activeDriver = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.role === 'driver'
    );
    if (activeDriver) {
      return res.status(400).json({
        error: 'A verified driver account with this email address already exists. Please log in directly.',
      });
    }

    const existingPending = db.driverApplications.find(
      (a) =>
        (a.email.toLowerCase() === email.toLowerCase() ||
          a.licenseNumber.toLowerCase() === licenseNumber.toLowerCase()) &&
        a.status === 'pending'
    );
    if (existingPending) {
      return res.status(400).json({
        error: `An application is already pending under this email/license (Application Ref: ${existingPending.id}). An administrator will review your submission shortly.`,
      });
    }

    const reg = GHANA_REGIONS.find((r) => r.id === preferredRegionId) || GHANA_REGIONS[0];

    const newApplication: DriverApplication = {
      id: `APP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      phone: phone.trim(),
      ghanaCardNumber: ghanaCardNumber.trim().toUpperCase(),
      licenseNumber: licenseNumber.trim().toUpperCase(),
      licenseClass: licenseClass || 'Class D (Heavy Goods & Tanker)',
      yearsExperience: yearsExperience ?? 3,
      preferredRegionId: reg.id,
      preferredRegionName: reg.name,
      preferredHubName: reg.depot.name,
      residentialAddress: residentialAddress || `${reg.capital}, ${reg.name}`,
      emergencyContact: emergencyContact || {
        name: 'Emergency Contact',
        phone: '+233 20 000 0000',
        relationship: 'Family Member',
      },
      hasHeavyHaulageCert: Boolean(hasHeavyHaulageCert),
      notes: notes || 'Submitted via CleanCollect Driver Onboarding Portal',
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    db.driverApplications.unshift(newApplication);

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: 'usr-adm-01',
      role: 'admin',
      title: `🚛 Driver Application: ${newApplication.fullName}`,
      message: `Applicant with ${newApplication.licenseClass} (${newApplication.yearsExperience} yrs exp) applied for ${reg.name} Region (${reg.depot.name}). Ghana Card: ${newApplication.ghanaCardNumber}. Needs Admin Vetting & Approval.`,
      type: 'warning',
      read: false,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      application: newApplication,
      message:
        'Driver application submitted successfully! Your submission has been forwarded to Operations Administration for identity and DVLA license verification.',
    });
  });

  // Driver Applications: List for Admin
  app.get('/api/driver-applications', (req: Request, res: Response) => {
    const { status, region } = req.query;
    let list = [...db.driverApplications];

    if (status && status !== 'all') {
      list = list.filter((a) => a.status === status);
    }
    if (region && region !== 'all') {
      list = list.filter((a) => a.preferredRegionId === region || a.preferredRegionName === region);
    }

    res.json({
      applications: list,
      totalCount: list.length,
      pendingCount: db.driverApplications.filter((a) => a.status === 'pending').length,
      approvedCount: db.driverApplications.filter((a) => a.status === 'approved').length,
    });
  });

  // Driver Applications: Single View
  app.get('/api/driver-applications/:id', (req: Request, res: Response) => {
    const appRecord = db.driverApplications.find((a) => a.id === req.params.id);
    if (!appRecord) {
      return res.status(404).json({ error: 'Driver application not found.' });
    }
    res.json(appRecord);
  });

  // Driver Applications: Admin Review & Approval
  app.post('/api/driver-applications/:id/review', validate(reviewDriverSchema), (req: Request, res: Response) => {
    const { id } = req.params;
    const { action, assignedTruckId, rejectionReason, reviewerName } = req.body as {
      action: 'approve' | 'reject';
      assignedTruckId?: string;
      rejectionReason?: string;
      reviewerName?: string;
    };

    const application = db.driverApplications.find((a) => a.id === id);
    if (!application) {
      return res.status(404).json({ error: 'Driver application not found.' });
    }

    if (action === 'approve') {
      // 1. Select or assign truck
      let truck = assignedTruckId ? db.trucks.find((t) => t.id === assignedTruckId) : null;
      if (!truck) {
        // Pick an idle truck or first available
        truck = db.trucks.find((t) => t.status === 'idle' || !t.assignedDriverId) || db.trucks[0];
      }

      // 2. Create official Driver User account
      const newDriverUserId = `usr-drv-${Date.now().toString().slice(-6)}`;
      const reg = GHANA_REGIONS.find((r) => r.id === application.preferredRegionId) || GHANA_REGIONS[0];

      const newDriverUser: User = {
        id: newDriverUserId,
        name: `${application.fullName} (${reg.name})`,
        email: application.email,
        phone: application.phone,
        password: hashPassword(cryptoRandomPassword()),
        isDemo: false,
        role: 'driver',
        status: 'active',
        ghanaCardNumber: application.ghanaCardNumber,
        licenseNumber: application.licenseNumber,
        address: `${reg.depot.name}, ${reg.name} Region`,
        regionId: reg.id,
        regionName: reg.name,
        assignedTruckPlate: truck.plateNumber,
        avatar: `https://images.unsplash.com/photo-${1500648767791 + (db.users.length % 5)}?w=150&auto=format&fit=crop&q=80`,
        coordinates: { lat: reg.depot.lat, lng: reg.depot.lng },
        createdAt: new Date().toISOString(),
      };

      db.users.push(newDriverUser);

      // 3. Create Driver profile entry in fleet roster
      const newDriverProfile: Driver = {
        id: newDriverUserId,
        name: application.fullName,
        email: application.email,
        phone: application.phone,
        licenseNumber: application.licenseNumber,
        status: 'available',
        assignedTruckId: truck.id,
        assignedTruckPlate: truck.plateNumber,
        rating: 5.0,
        completedTrips: 0,
        activeTasksCount: 0,
        currentLocation: { lat: reg.depot.lat, lng: reg.depot.lng },
        avatar: newDriverUser.avatar!,
      };

      db.drivers.push(newDriverProfile);

      // 4. Update Truck assignment
      if (truck) {
        truck.assignedDriverId = newDriverUserId;
        truck.assignedDriverName = newDriverUser.name;
      }

      // 5. Update Application record
      application.status = 'approved';
      application.reviewedAt = new Date().toISOString();
      application.reviewedBy = reviewerName || 'Akua Addo (National Operations Director)';
      application.assignedTruckId = truck.id;
      application.assignedTruckPlate = truck.plateNumber;
      application.assignedDriverId = newDriverUserId;

      // 6. Push Activation Notification
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: newDriverUserId,
        role: 'driver',
        title: '🎉 Driver Account Approved & Activated!',
        message: `Welcome to CleanCollect Fleet Operations! You have been assigned to Truck ${truck.plateNumber} at ${reg.depot.name}. You can now view active route stops and dispatch orders.`,
        type: 'success',
        read: false,
        timestamp: new Date().toISOString(),
      });

      db.notifications.unshift({
        id: `notif-${Date.now() + 1}`,
        userId: 'usr-adm-01',
        role: 'admin',
        title: `✅ Driver Approved: ${application.fullName}`,
        message: `Driver account ${newDriverUserId} activated for ${reg.name} hub with vehicle ${truck.plateNumber}.`,
        type: 'success',
        read: false,
        timestamp: new Date().toISOString(),
      });

      return res.json({
        success: true,
        message: `Driver application for ${application.fullName} has been APPROVED. Account activated and assigned to ${truck.plateNumber}.`,
        application,
        driverUser: newDriverUser,
        driverProfile: newDriverProfile,
      });
    } else if (action === 'reject') {
      application.status = 'rejected';
      application.rejectionReason =
        rejectionReason || 'Credentials or DVLA heavy commercial license class did not pass verification.';
      application.reviewedAt = new Date().toISOString();
      application.reviewedBy = reviewerName || 'Akua Addo (National Operations Director)';

      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: 'usr-adm-01',
        role: 'admin',
        title: `Driver Application Rejected: ${application.fullName}`,
        message: `Application ${application.id} rejected. Reason: ${application.rejectionReason}`,
        type: 'info',
        read: false,
        timestamp: new Date().toISOString(),
      });

      return res.json({
        success: true,
        message: `Driver application ${application.id} has been rejected.`,
        application,
      });
    } else {
      return res.status(400).json({ error: "Invalid action. Use 'approve' or 'reject'." });
    }
  });

  // Admin: Create New Administrator (Admin-Only)
  app.post('/api/admin/create-admin', validate(createAdminSchema), (req: Request, res: Response) => {
    const { name, email, phone, password, address, creatorRole } = req.body as {
      name: string;
      email: string;
      phone?: string;
      password?: string;
      address?: string;
      creatorRole?: 'customer' | 'driver' | 'admin';
    };

    if (creatorRole !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Only existing System Administrators can create administrator accounts.',
      });
    }

    const newAdmin: User = {
      id: `usr-adm-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone || '+233 30 000 0000',
      password: hashPassword(password || cryptoRandomPassword()),
      isDemo: false,
      role: 'admin',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      address: address || 'National Headquarters, Accra',
      coordinates: { lat: 5.578, lng: -0.192 },
      createdAt: new Date().toISOString(),
    };

    db.users.push(newAdmin);

    res.status(201).json({
      success: true,
      message: `System Administrator account for ${newAdmin.name} created successfully.`,
      user: newAdmin,
    });
  });

  // Ghana Regions & National Hubs
  app.get('/api/regions', (req: Request, res: Response) => {
    res.json({
      regions: GHANA_REGIONS,
      totalRegions: GHANA_REGIONS.length,
      nationalDepots: getAllGhanaDepots(),
      nationalLandfills: getAllGhanaLandfills(),
    });
  });

  // Collections: List with filters
  app.get('/api/collections', (req: Request, res: Response) => {
    const { status, customerId, driverId, wasteType, region } = req.query;
    let result = [...db.collections];

    if (status && status !== 'all') {
      result = result.filter((c) => c.status === status);
    }
    if (customerId) {
      result = result.filter((c) => c.customerId === customerId);
    }
    if (driverId) {
      result = result.filter((c) => c.assignedDriverId === driverId);
    }
    if (wasteType && wasteType !== 'all') {
      result = result.filter((c) => c.wasteType === wasteType);
    }
    if (region && region !== 'all') {
      result = result.filter(
        (c) =>
          c.location.region?.toLowerCase().includes((region as string).toLowerCase()) ||
          c.location.address.toLowerCase().includes((region as string).toLowerCase())
      );
    }

    res.json(result);
  });

  // Collections: Get Single
  app.get('/api/collections/:id', (req: Request, res: Response) => {
    const item = db.collections.find((c) => c.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Collection request not found' });
    }
    res.json(item);
  });

  // Collections: Calculate Price Estimate
  app.post('/api/collections/calculate-price', validate(calculatePriceSchema), (req: Request, res: Response) => {
    const { wasteType, quantity, quantityUnit, urgency, lat, lng } = req.body;
    const pricing = db.calculatePricing(
      wasteType || 'general_bulk',
      Number(quantity) || 1,
      quantityUnit || 'bins',
      urgency || 'standard',
      Number(lat) || 5.6037,
      Number(lng) || -0.1870
    );
    res.json(pricing);
  });

  // Collections: Create Request
  app.post('/api/collections', validate(createCollectionSchema), (req: Request, res: Response) => {
    const {
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      wasteType,
      quantity,
      quantityUnit,
      estimatedWeightKg,
      location,
      preferredDate,
      preferredTimeSlot,
      urgency,
      specialInstructions,
      paymentMethod,
    } = req.body;

    const lat = Number(location?.lat) || 5.6052;
    const lng = Number(location?.lng) || -0.1741;
    const pricing = db.calculatePricing(wasteType, Number(quantity) || 1, quantityUnit, urgency, lat, lng);

    const newId = `REQ-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const newRequest: CollectionRequest = {
      id: newId,
      customerId: customerId || 'usr-cust-01',
      customerName: customerName || 'Kwame Mensah',
      customerPhone: customerPhone || '+233 24 412 3456',
      customerEmail: customerEmail || 'kwame@example.com',
      wasteType: wasteType || 'general_bulk',
      quantity: Number(quantity) || 1,
      quantityUnit: quantityUnit || 'bins',
      estimatedWeightKg: Number(estimatedWeightKg) || (Number(quantity) || 1) * 25,
      location: {
        address: location?.address || 'Accra Central',
        landmark: location?.landmark || '',
        area: location?.area || 'Greater Accra',
        lat,
        lng,
      },
      preferredDate: preferredDate || new Date().toISOString().split('T')[0],
      preferredTimeSlot: preferredTimeSlot || '09:00 - 12:00',
      urgency: urgency || 'standard',
      specialInstructions: specialInstructions || '',
      status: 'pending',
      pricing,
      paymentStatus: paymentMethod === 'cash' ? 'unpaid' : 'paid',
      paymentMethod: paymentMethod || 'momo',
      paymentReference: `${(paymentMethod || 'momo').toUpperCase()}-GH-${Date.now().toString().slice(-8)}`,
      timestamps: {
        createdAt: new Date().toISOString(),
      },
    };

    db.collections.unshift(newRequest);
    publish({ type: 'collection-status', collectionId: newRequest.id, status: 'pending' });

    // Create payment record if paid
    if (newRequest.paymentStatus === 'paid') {
      db.payments.unshift({
        id: `PAY-${Date.now().toString().slice(-5)}`,
        collectionId: newRequest.id,
        customerId: newRequest.customerId,
        customerName: newRequest.customerName,
        amountGHS: pricing.totalGHS,
        method: newRequest.paymentMethod || 'momo',
        status: 'paid',
        transactionDate: new Date().toISOString(),
        reference: newRequest.paymentReference || `REF-${Date.now()}`,
        receiptNumber: `REC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        provider: newRequest.paymentMethod === 'momo' ? 'MTN Mobile Money' : 'Visa Online',
      });
    }

    // Add admin notification
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: 'usr-adm-01',
      role: 'admin',
      title: 'New Waste Collection Request',
      message: `${newRequest.customerName} submitted a ${newRequest.urgency} pickup request (${newRequest.quantity} ${newRequest.quantityUnit} of ${newRequest.wasteType}) in ${newRequest.location.area}.`,
      type: 'info',
      read: false,
      timestamp: new Date().toISOString(),
      collectionId: newRequest.id,
    });

    res.status(201).json(newRequest);
  });

  // Collections: Cancel Request
  app.put('/api/collections/:id/cancel', validate(cancelCollectionSchema), (req: Request, res: Response) => {
    const { reason } = req.body;
    const item = db.collections.find((c) => c.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Collection request not found' });
    }
    item.status = 'cancelled';
    item.cancellationReason = reason || 'Customer requested cancellation';
    item.timestamps.cancelledAt = new Date().toISOString();
    publish({ type: 'collection-status', collectionId: item.id, status: 'cancelled' });

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: 'usr-adm-01',
      role: 'admin',
      title: 'Collection Cancelled',
      message: `Request ${item.id} from ${item.customerName} was cancelled.`,
      type: 'warning',
      read: false,
      timestamp: new Date().toISOString(),
      collectionId: item.id,
    });

    res.json(item);
  });

  // Collections: Admin Assign Driver and Truck
  app.put('/api/collections/:id/assign', validate(assignCollectionSchema), (req: Request, res: Response) => {
    const { driverId, truckId } = req.body;
    const item = db.collections.find((c) => c.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Collection request not found' });
    }

    const driver = db.drivers.find((d) => d.id === driverId);
    const truck = db.trucks.find((t) => t.id === truckId || (driver && t.id === driver.assignedTruckId));

    if (!driver) {
      return res.status(400).json({ error: 'Selected driver not found' });
    }

    item.status = 'assigned';
    item.assignedDriverId = driver.id;
    item.assignedDriverName = driver.name;
    item.assignedDriverPhone = driver.phone;
    if (truck) {
      item.assignedTruckId = truck.id;
      item.assignedTruckPlate = truck.plateNumber;
    }
    item.timestamps.assignedAt = new Date().toISOString();
    publish({ type: 'collection-status', collectionId: item.id, status: 'assigned', assignedDriverId: driver.id });

    // Notify Driver
    db.notifications.unshift({
      id: `notif-${Date.now()}-drv`,
      userId: driver.id,
      role: 'driver',
      title: 'New Job Assignment',
      message: `You have been assigned to collect ${item.wasteType} from ${item.customerName} at ${item.location.area}.`,
      type: 'info',
      read: false,
      timestamp: new Date().toISOString(),
      collectionId: item.id,
    });

    // Notify Customer
    db.notifications.unshift({
      id: `notif-${Date.now()}-cust`,
      userId: item.customerId,
      role: 'customer',
      title: 'Driver Assigned!',
      message: `Driver ${driver.name} (${driver.phone}) in truck ${item.assignedTruckPlate || 'GT-4821-22'} has been assigned to your collection.`,
      type: 'success',
      read: false,
      timestamp: new Date().toISOString(),
      collectionId: item.id,
    });

    res.json(item);
  });

  // Driver: Start Collection
  app.put('/api/driver/collections/:id/start', (req: Request, res: Response) => {
    const item = db.collections.find((c) => c.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    item.status = 'in_progress';
    item.timestamps.startedAt = new Date().toISOString();
    publish({ type: 'collection-status', collectionId: item.id, status: 'in_progress', assignedDriverId: item.assignedDriverId });

    // Notify customer
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: item.customerId,
      role: 'customer',
      title: 'Driver Is En Route!',
      message: `Driver ${item.assignedDriverName || 'Your assigned driver'} has started the route to your location.`,
      type: 'info',
      read: false,
      timestamp: new Date().toISOString(),
      collectionId: item.id,
    });

    res.json(item);
  });

  // Driver: Complete Collection
  app.put('/api/driver/collections/:id/complete', validate(completeCollectionSchema), (req: Request, res: Response) => {
    const { completedWeightKg, proofPhotoUrl, notes } = req.body;
    const item = db.collections.find((c) => c.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    item.status = 'completed';
    item.completedWeightKg = Number(completedWeightKg) || item.estimatedWeightKg;
    publish({ type: 'collection-status', collectionId: item.id, status: 'completed', assignedDriverId: item.assignedDriverId });
    item.completionProofPhotoUrl =
      proofPhotoUrl ||
      'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop&q=80';
    item.driverNotes = notes || 'Waste collected successfully.';
    item.timestamps.completedAt = new Date().toISOString();

    // Update driver trip count
    if (item.assignedDriverId) {
      const drv = db.drivers.find((d) => d.id === item.assignedDriverId);
      if (drv) {
        drv.completedTrips += 1;
        drv.activeTasksCount = Math.max(0, drv.activeTasksCount - 1);
      }
    }

    // Update truck load
    if (item.assignedTruckId) {
      const trk = db.trucks.find((t) => t.id === item.assignedTruckId);
      if (trk) {
        trk.currentLoadKg += item.completedWeightKg;
      }
    }

    // Notify customer to rate
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: item.customerId,
      role: 'customer',
      title: 'Waste Collected Successfully! 🌟',
      message: `Your collection (${item.completedWeightKg} kg of ${item.wasteType}) was completed. Please rate your experience!`,
      type: 'success',
      read: false,
      timestamp: new Date().toISOString(),
      collectionId: item.id,
    });

    res.json(item);
  });

  // Driver: Report Failed Collection
  app.put('/api/driver/collections/:id/report-failed', validate(failCollectionSchema), (req: Request, res: Response) => {
    const { failureReason, notes } = req.body;
    const item = db.collections.find((c) => c.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    item.status = 'failed';
    item.failureReason = failureReason || 'Location inaccessible or customer not available';
    item.driverNotes = notes || '';
    publish({ type: 'collection-status', collectionId: item.id, status: 'failed', assignedDriverId: item.assignedDriverId });

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: item.customerId,
      role: 'customer',
      title: 'Collection Attempt Unsuccessful',
      message: `Your collection could not be completed: ${item.failureReason}. Our support team will reach out.`,
      type: 'error',
      read: false,
      timestamp: new Date().toISOString(),
      collectionId: item.id,
    });

    res.json(item);
  });

  // Ratings: Rate a collection
  app.post('/api/ratings', validate(ratingSchema), (req: Request, res: Response) => {
    const { collectionId, rating, feedback } = req.body;
    const item = db.collections.find((c) => c.id === collectionId);
    if (!item) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    item.rating = Number(rating) || 5;
    item.feedback = feedback || '';

    // Update driver overall rating
    if (item.assignedDriverId) {
      const drv = db.drivers.find((d) => d.id === item.assignedDriverId);
      if (drv) {
        drv.rating = Math.round(((drv.rating * 19 + item.rating) / 20) * 100) / 100;
      }
    }

    res.json({ success: true, collection: item });
  });

  // Route Optimization API
  app.get('/api/route/optimize', (req: Request, res: Response) => {
    const driverId = (req.query.driverId as string) || 'usr-drv-01';
    const result = db.optimizeDriverRoute(driverId);
    res.json(result);
  });

  // Admin Dashboard Metrics
  app.get('/api/admin/dashboard', (req: Request, res: Response) => {
    const totalRequests = db.collections.length;
    const pendingRequests = db.collections.filter((c) => c.status === 'pending').length;
    const activeTrips = db.collections.filter((c) => c.status === 'in_progress' || c.status === 'assigned').length;
    const completedToday = db.collections.filter((c) => c.status === 'completed').length;
    const totalRevenueGHS = db.payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amountGHS, 0);
    const totalWasteCollectedKg = db.collections
      .filter((c) => c.status === 'completed')
      .reduce((sum, c) => sum + (c.completedWeightKg || c.estimatedWeightKg), 0);

    const activeDriversCount = db.drivers.filter((d) => d.status === 'on_route' || d.status === 'available').length;
    const activeTrucksCount = db.trucks.filter((t) => t.status === 'active' || t.status === 'in_route').length;

    // Status breakdown
    const statuses: CollectionStatus[] = ['pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled'];
    const statusDistribution = statuses.map((s) => ({
      status: s,
      count: db.collections.filter((c) => c.status === s).length,
    }));

    // Category breakdown
    const categories: WasteCategory[] = ['organic', 'recyclables', 'electronic', 'hazardous', 'general_bulk', 'construction'];
    const wasteCategoryDistribution = categories.map((cat) => {
      const catCols = db.collections.filter((c) => c.wasteType === cat);
      return {
        category: cat,
        weightKg: catCols.reduce((sum, c) => sum + (c.completedWeightKg || c.estimatedWeightKg), 0),
        count: catCols.length,
      };
    });

    const weeklyRevenueTrend = [
      { date: 'Aug 12', revenue: 1420, collections: 8 },
      { date: 'Aug 13', revenue: 1890, collections: 11 },
      { date: 'Aug 14', revenue: 2150, collections: 14 },
      { date: 'Aug 15', revenue: 2840, collections: 17 },
      { date: 'Aug 16', revenue: 3290, collections: 19 },
      { date: 'Aug 17', revenue: 2950, collections: 16 },
      { date: 'Aug 18 (Today)', revenue: Math.round(totalRevenueGHS), collections: totalRequests },
    ];

    const recentActivities = [
      { id: '1', text: 'Truck GT-4821-22 en route to Airport Residential pickup', time: '5m ago', type: 'route' },
      { id: '2', text: 'Dr. David K. Addo created E-Waste pickup request (Legon)', time: '18m ago', type: 'request' },
      { id: '3', text: 'Payment of GH₵ 524.48 verified for Abena Osei Enterprises', time: '35m ago', type: 'payment' },
      { id: '4', text: 'Route optimization saved 14.8 km and 5.2L fuel for Driver Ama Serwaa', time: '1h ago', type: 'optimization' },
    ];

    const metrics: DashboardMetrics = {
      totalRequests,
      pendingRequests,
      activeTrips,
      completedToday,
      totalRevenueGHS: Math.round(totalRevenueGHS * 100) / 100,
      totalWasteCollectedKg,
      activeDriversCount,
      activeTrucksCount,
      customerSatisfactionScore: 4.87,
      statusDistribution,
      wasteCategoryDistribution,
      weeklyRevenueTrend,
      recentActivities,
    };

    res.json(metrics);
  });

  // Admin: Customers List
  app.get('/api/admin/customers', (req: Request, res: Response) => {
    const customers = db.users
      .filter((u) => u.role === 'customer')
      .map((cust) => {
        const custRequests = db.collections.filter((c) => c.customerId === cust.id);
        const totalSpent = db.payments
          .filter((p) => p.customerId === cust.id && p.status === 'paid')
          .reduce((sum, p) => sum + p.amountGHS, 0);
        return {
          ...cust,
          totalRequests: custRequests.length,
          activeRequests: custRequests.filter((c) => c.status === 'pending' || c.status === 'assigned' || c.status === 'in_progress').length,
          totalSpentGHS: Math.round(totalSpent * 100) / 100,
        };
      });
    res.json(customers);
  });

  // Admin: Drivers List
  app.get('/api/admin/drivers', (req: Request, res: Response) => {
    res.json(db.drivers);
  });

  // Admin: Trucks List
  app.get('/api/admin/trucks', (req: Request, res: Response) => {
    res.json(db.trucks);
  });

  // Admin: Pricing rules (Get / Update)
  app.get('/api/admin/pricing', (req: Request, res: Response) => {
    res.json(db.pricingRules);
  });

  app.put('/api/admin/pricing', validate(updatePricingSchema), (req: Request, res: Response) => {
    db.pricingRules = { ...db.pricingRules, ...req.body };
    res.json({ success: true, pricingRules: db.pricingRules });
  });

  // Admin: Payments
  app.get('/api/admin/payments', (req: Request, res: Response) => {
    res.json(db.payments);
  });

  // Notifications API
  app.get('/api/notifications', (req: Request, res: Response) => {
    const { userId, role } = req.query;
    let notifs = [...db.notifications];
    if (userId) {
      notifs = notifs.filter((n) => n.userId === userId || n.role === role);
    }
    res.json(notifs);
  });

  app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
    const notif = db.notifications.find((n) => n.id === req.params.id);
    if (notif) {
      notif.read = true;
    }
    res.json({ success: true });
  });

  app.put('/api/notifications/mark-all-read', (req: Request, res: Response) => {
    db.notifications.forEach((n) => (n.read = true));
    res.json({ success: true });
  });

  // Real-time event stream (SSE) — clients subscribe for live driver location + status updates
  app.get('/api/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (evt: BusEvent) => {
      try {
        res.write(`event: ${evt.type}\n`);
        res.write(`data: ${JSON.stringify(evt)}\n\n`);
      } catch {
        // ignore broken pipe
      }
    };

    for (const d of db.drivers) {
      send({
        type: 'driver-location',
        driverId: d.id,
        lat: d.currentLocation?.lat ?? 0,
        lng: d.currentLocation?.lng ?? 0,
        speedKph: 0,
        heading: 'N',
        timestamp: new Date().toISOString(),
      });
    }
    send({ type: 'ping', timestamp: new Date().toISOString() });

    const listener = (evt: BusEvent) => send(evt);
    bus.on('event', listener);

    const heartbeat = setInterval(() => send({ type: 'ping', timestamp: new Date().toISOString() }), 25_000);
    req.on('close', () => {
      clearInterval(heartbeat);
      bus.off('event', listener);
    });
  });

  // Driver pushes a live GPS update (real GPS or simulator)
  app.post('/api/driver/location', validate(driverLocationSchema), (req: Request, res: Response) => {
    const { driverId, lat, lng, speedKph, heading } = req.body as {
      driverId: string;
      lat: number;
      lng: number;
      speedKph?: number;
      heading?: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
    };

    const driver = db.drivers.find((d) => d.id === driverId);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    driver.currentLocation = { lat, lng };
    if (driver.status === 'available') driver.status = 'on_route';

    publish({
      type: 'driver-location',
      driverId,
      lat,
      lng,
      speedKph: speedKph ?? 25,
      heading: heading ?? 'N',
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true });
  });

  // Admin: DB persistence inspection (helps verify dev/prod parity)
  app.get('/api/admin/db-info', (_req: Request, res: Response) => {
    const file = path.resolve(process.env.DATA_DIR || process.cwd(), 'data', 'db.json');
    const exists = fs.existsSync(file);
    const fileSize = exists ? fs.statSync(file).size : null;
    res.json({
      persistent: exists,
      path: 'data/db.json',
      absolutePath: file,
      dataDir: path.resolve(process.env.DATA_DIR || process.cwd(), 'data'),
      sizeBytes: fileSize,
      recordCounts: {
        users: db.users.length,
        collections: db.collections.length,
        drivers: db.drivers.length,
        trucks: db.trucks.length,
        payments: db.payments.length,
        notifications: db.notifications.length,
        driverApplications: db.driverApplications.length,
      },
    });
  });

  // SaaS Plans API
  app.get('/api/saas-plans', (req: Request, res: Response) => {
    const plans: SaasPlan[] = [
      {
        id: 'plan-basic',
        name: 'Basic Waste Operator',
        priceGHS: 30,
        period: 'month',
        description: 'Ideal for independent collection contractors and small urban operators.',
        features: [
          'Up to 2 Collection Trucks',
          'Standard Customer Request Portal',
          'Basic Mobile Money & Cash Log',
          'Manual Driver Task Assignment',
          'Standard Email Notifications',
        ],
      },
      {
        id: 'plan-business',
        name: 'Business Fleet',
        priceGHS: 100,
        period: 'month',
        recommended: true,
        description: 'Perfect for growing waste management companies and municipal service contractors.',
        features: [
          'Up to 10 Collection Trucks',
          'Smart Nearest-Neighbor Route Optimization',
          'Driver Mobile Field Dashboard with Turn-by-Turn',
          'Instant Mobile Money & Card Integration',
          'Dynamic Pricing Engine by Weight & Urgency',
          'Automated Customer SMS & App Alerts',
          'Fleet Telematics & Load Management',
        ],
      },
      {
        id: 'plan-enterprise',
        name: 'Enterprise Municipality',
        priceGHS: 300,
        period: 'month',
        description: 'Comprehensive platform for large waste conglomerates, city councils, and multi-branch fleets.',
        features: [
          'Unlimited Trucks & Drivers',
          'Multi-Branch & Landfill Depot Routing',
          'Advanced Real-Time GPS Tracking & Geofencing',
          'Custom Rate Cards & Corporate B2B Invoicing',
          'Dedicated 24/7 Account Specialist',
          'Custom Environmental & ESG Compliance Reports',
          'Full REST API & ERP Integration',
        ],
      },
    ];
    res.json(plans);
  });

  // Reset database for fresh demo
  app.post('/api/seed/reset', (req: Request, res: Response) => {
    db.seed();
    res.json({ success: true, message: 'Database reset to initial demo state' });
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  // `fileURLToPath(import.meta.url)` is the canonical ESM way to detect "this
  // file was run directly", but in CJS bundles `import.meta.url` is empty and
  // the call throws. Only evaluate it when we actually have a URL.
  const metaUrl = (import.meta as { url?: string }).url;
  const entryPath = metaUrl ? fileURLToPath(metaUrl) : '';
  if (entryPath && process.argv[1] === entryPath) {
    const app = createApp();
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    app.listen(port, host, () => {
      console.log(`CleanCollect API listening on http://${host}:${port}`);
      console.log(`CORS origins: ${(process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')}`);
    });
  }
}
