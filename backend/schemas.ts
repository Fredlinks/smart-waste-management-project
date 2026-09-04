import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

const wasteCategory = z.enum([
  'organic',
  'recyclables',
  'electronic',
  'hazardous',
  'general_bulk',
  'construction',
]);
const quantityUnit = z.enum(['bags', 'bins', 'kg', 'truckload']);
const urgency = z.enum(['standard', 'express']);
const paymentMethod = z.enum(['momo', 'card', 'cash', 'bank_transfer']);
const userRole = z.enum(['customer', 'driver', 'admin']);

const locationSchema = z.object({
  address: z.string().min(1).max(500),
  landmark: z.string().max(500).optional().default(''),
  area: z.string().min(1).max(200),
  region: z.string().max(200).optional(),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

const emergencyContactSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(5).max(40),
  relationship: z.string().min(1).max(80),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().min(1).max(200).optional(),
  password: z.string().max(200).optional(),
  role: userRole.optional(),
});

export const registerCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(5).max(40).optional(),
  password: z.string().min(8).max(200).optional(),
  address: z.string().max(500).optional(),
  regionId: z.string().max(80).optional(),
  regionName: z.string().max(120).optional(),
  area: z.string().max(200).optional(),
  lat: z.number().gte(-90).lte(90).optional(),
  lng: z.number().gte(-180).lte(180).optional(),
});

export const applyDriverSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(5).max(40),
  ghanaCardNumber: z.string().trim().min(5).max(40),
  licenseNumber: z.string().trim().min(3).max(40),
  licenseClass: z.string().max(120).optional(),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  preferredRegionId: z.string().max(80).optional(),
  residentialAddress: z.string().max(500).optional(),
  emergencyContact: emergencyContactSchema.optional(),
  hasHeavyHaulageCert: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export const reviewDriverSchema = z.object({
  action: z.enum(['approve', 'reject']),
  assignedTruckId: z.string().max(40).optional(),
  rejectionReason: z.string().max(500).optional(),
  reviewerName: z.string().max(120).optional(),
});

export const createAdminSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(5).max(40).optional(),
  password: z.string().min(8).max(200).optional(),
  address: z.string().max(500).optional(),
  creatorRole: userRole.optional(),
});

export const calculatePriceSchema = z.object({
  wasteType: wasteCategory.optional(),
  quantity: z.number().positive().max(100000).optional(),
  quantityUnit: quantityUnit.optional(),
  urgency: urgency.optional(),
  lat: z.number().gte(-90).lte(90).optional(),
  lng: z.number().gte(-180).lte(180).optional(),
});

export const createCollectionSchema = z
  .object({
    customerId: z.string().max(40).optional(),
    customerName: z.string().max(120).optional(),
    customerPhone: z.string().max(40).optional(),
    customerEmail: z.string().max(200).optional(),
    wasteType: wasteCategory.optional(),
    quantity: z.number().positive().max(100000).optional(),
    quantityUnit: quantityUnit.optional(),
    estimatedWeightKg: z.number().nonnegative().max(1000000).optional(),
    location: locationSchema.partial().optional(),
    preferredDate: z.string().max(40).optional(),
    preferredTimeSlot: z.string().max(80).optional(),
    urgency: urgency.optional(),
    specialInstructions: z.string().max(2000).optional(),
    paymentMethod: paymentMethod.optional(),
  })
  .passthrough();

export const cancelCollectionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const assignCollectionSchema = z.object({
  driverId: z.string().min(1).max(40),
  truckId: z.string().max(40).optional(),
});

export const startCollectionSchema = z.object({}).passthrough();

export const completeCollectionSchema = z.object({
  completedWeightKg: z.number().nonnegative().max(1000000).optional(),
  proofPhotoUrl: z.string().url().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

export const failCollectionSchema = z.object({
  failureReason: z.string().min(1).max(500),
  notes: z.string().max(2000).optional(),
});

export const ratingSchema = z.object({
  collectionId: z.string().min(1).max(40),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional(),
});

export const updatePricingSchema = z
  .object({
    baseFeeGHS: z.number().nonnegative().max(100000).optional(),
    distanceRatePerKm: z.number().nonnegative().max(1000).optional(),
    expressMultiplier: z.number().min(1).max(10).optional(),
    vatRatePct: z.number().min(0).max(50).optional(),
  })
  .passthrough();

export const driverLocationSchema = z.object({
  driverId: z.string().min(1).max(40),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  speedKph: z.number().min(0).max(200).optional(),
  heading: z.enum(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']).optional(),
});

export const notificationReadSchema = z.object({}).passthrough();

export function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({ error: 'Invalid request body', issues });
    }
    req.body = result.data;
    next();
  };
}