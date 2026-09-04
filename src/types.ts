export type UserRole = 'customer' | 'driver' | 'admin';

export type WasteCategory =
  | 'organic'
  | 'recyclables'
  | 'electronic'
  | 'hazardous'
  | 'general_bulk'
  | 'construction';

export type QuantityUnit = 'bags' | 'bins' | 'kg' | 'truckload';

export type UrgencyLevel = 'standard' | 'express';

export type CollectionStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type PaymentMethod = 'momo' | 'card' | 'cash' | 'bank_transfer';
export type PaymentStatus = 'unpaid' | 'paid' | 'pending_verification' | 'refunded';

export type DriverApplicationStatus = 'pending' | 'approved' | 'rejected' | 'under_review';

export interface DriverApplication {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  ghanaCardNumber: string;
  licenseNumber: string;
  licenseClass: string;
  yearsExperience: number;
  preferredRegionId: string;
  preferredRegionName: string;
  preferredHubName: string;
  residentialAddress: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  hasHeavyHaulageCert: boolean;
  notes?: string;
  status: DriverApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  assignedTruckId?: string;
  assignedTruckPlate?: string;
  assignedDriverId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatar?: string;
  address?: string;
  regionId?: string;
  regionName?: string;
  status?: 'active' | 'pending_approval' | 'suspended';
  ghanaCardNumber?: string;
  licenseNumber?: string;
  assignedTruckPlate?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  password?: string;
  isDemo?: boolean;
  createdAt: string;
}

export interface CollectionLocation {
  address: string;
  landmark?: string;
  area: string;
  region?: string;
  lat: number;
  lng: number;
}

export interface PriceBreakdown {
  baseFee: number;
  wasteTypeRate: number;
  volumeFee: number;
  distanceFee: number;
  urgencySurcharge: number;
  subtotal: number;
  tax: number;
  totalGHS: number;
}

export interface CollectionRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  wasteType: WasteCategory;
  quantity: number;
  quantityUnit: QuantityUnit;
  estimatedWeightKg: number;
  location: CollectionLocation;
  preferredDate: string;
  preferredTimeSlot: string; // e.g. "08:00 - 11:00"
  urgency: UrgencyLevel;
  specialInstructions?: string;
  photoUrl?: string;
  status: CollectionStatus;
  pricing: PriceBreakdown;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedTruckId?: string;
  assignedTruckPlate?: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  cancellationReason?: string;
  failureReason?: string;
  completionProofPhotoUrl?: string;
  completedWeightKg?: number;
  driverNotes?: string;
  rating?: number;
  feedback?: string;
  timestamps: {
    createdAt: string;
    assignedAt?: string;
    startedAt?: string;
    completedAt?: string;
    cancelledAt?: string;
  };
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  status: 'available' | 'on_route' | 'off_duty' | 'break';
  assignedTruckId?: string;
  assignedTruckPlate?: string;
  rating: number;
  completedTrips: number;
  activeTasksCount: number;
  currentLocation: {
    lat: number;
    lng: number;
  };
  avatar: string;
}

export interface Truck {
  id: string;
  plateNumber: string;
  model: string;
  capacityKg: number;
  currentLoadKg: number;
  fuelLevelPct: number;
  status: 'active' | 'maintenance' | 'in_route' | 'idle';
  assignedDriverId?: string;
  assignedDriverName?: string;
  lastServiceDate: string;
  nextServiceDate: string;
  mileageKm: number;
}

export interface PricingRule {
  baseFeeGHS: number;
  unitRates: Record<WasteCategory, Record<QuantityUnit, number>>;
  distanceRatePerKm: number;
  expressMultiplier: number;
  vatRatePct: number;
}

export interface PaymentRecord {
  id: string;
  collectionId: string;
  customerId: string;
  customerName: string;
  amountGHS: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionDate: string;
  reference: string;
  receiptNumber: string;
  provider?: string; // MTN MoMo, Telecel, Visa, etc.
}

export interface AppNotification {
  id: string;
  userId: string;
  role?: UserRole;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: string;
  collectionId?: string;
}

export interface RouteStop {
  stopNumber: number;
  type: 'depot' | 'collection' | 'landfill';
  id?: string;
  customerName?: string;
  customerPhone?: string;
  address: string;
  lat: number;
  lng: number;
  wasteType?: WasteCategory;
  quantity?: string;
  weightKg?: number;
  status?: CollectionStatus;
  estimatedArrival?: string;
}

export interface RouteOptimizationResult {
  driverId: string;
  driverName: string;
  truckPlate: string;
  totalDistanceKm: number;
  estimatedDurationMin: number;
  fuelSavedLiters: number;
  carbonReducedKg: number;
  stops: RouteStop[];
  routeCoordinates: [number, number][];
}

export interface DashboardMetrics {
  totalRequests: number;
  pendingRequests: number;
  activeTrips: number;
  completedToday: number;
  totalRevenueGHS: number;
  totalWasteCollectedKg: number;
  activeDriversCount: number;
  activeTrucksCount: number;
  customerSatisfactionScore: number;
  statusDistribution: { status: string; count: number }[];
  wasteCategoryDistribution: { category: string; weightKg: number; count: number }[];
  weeklyRevenueTrend: { date: string; revenue: number; collections: number }[];
  recentActivities: { id: string; text: string; time: string; type: string }[];
}

export interface SaasPlan {
  id: string;
  name: string;
  priceGHS: number;
  period: 'month' | 'year';
  description: string;
  features: string[];
  recommended?: boolean;
}
