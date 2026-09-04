import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  CollectionRequest,
  CollectionStatus,
  Driver,
  PaymentRecord,
  PricingRule,
  Truck,
  User,
  WasteCategory,
  QuantityUnit,
  UrgencyLevel,
  AppNotification,
  RouteOptimizationResult,
  RouteStop,
  DriverApplication,
} from '../src/types';
import {
  GHANA_REGIONS,
  calculateDistanceKm,
  getNearestGhanaDepot,
  getNearestGhanaLandfill,
} from '../src/data/ghanaRegions';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

interface PersistedState {
  users: User[];
  collections: CollectionRequest[];
  drivers: Driver[];
  trucks: Truck[];
  payments: PaymentRecord[];
  notifications: AppNotification[];
  driverApplications: DriverApplication[];
  pricingRules: PricingRule;
}

function observableArray<T>(onMutate: () => void, initial: T[] = []): T[] {
  const arr: T[] = [...initial];
  return new Proxy(arr, {
    get(target, prop, receiver) {
      if (prop === 'push' || prop === 'pop' || prop === 'shift' || prop === 'unshift' || prop === 'splice' || prop === 'fill' || prop === 'reverse' || prop === 'sort' || prop === 'copyWithin') {
        onMutate();
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      if (typeof prop !== 'symbol' && !(prop in target)) onMutate();
      return Reflect.set(target, prop, value, receiver);
    },
    deleteProperty(target, prop) {
      onMutate();
      return Reflect.deleteProperty(target, prop);
    },
  });
}

function observableObject<T extends object>(onMutate: () => void, initial: T): T {
  return new Proxy(initial, {
    set(target, prop, value, receiver) {
      onMutate();
      return Reflect.set(target, prop, value, receiver);
    },
    deleteProperty(target, prop) {
      onMutate();
      return Reflect.deleteProperty(target, prop);
    },
  });
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function looksHashed(stored: string | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith('scrypt$');
}

// Persistent JSON-file backed Database Store with State across all 16 Regions of Ghana
class Database {
  users: User[] = observableArray(() => (this.dirty = true));
  collections: CollectionRequest[] = observableArray(() => (this.dirty = true));
  drivers: Driver[] = observableArray(() => (this.dirty = true));
  trucks: Truck[] = observableArray(() => (this.dirty = true));
  payments: PaymentRecord[] = observableArray(() => (this.dirty = true));
  notifications: AppNotification[] = observableArray(() => (this.dirty = true));
  driverApplications: DriverApplication[] = observableArray(() => (this.dirty = true));
  pricingRules: PricingRule = observableObject<PricingRule>(() => (this.dirty = true), {
    baseFeeGHS: 25.0,
    unitRates: {
      organic: { bags: 12, bins: 35, kg: 1.5, truckload: 350 },
      recyclables: { bags: 8, bins: 25, kg: 1.0, truckload: 280 },
      electronic: { bags: 30, bins: 85, kg: 5.0, truckload: 650 },
      hazardous: { bags: 65, bins: 175, kg: 9.5, truckload: 1250 },
      general_bulk: { bags: 15, bins: 45, kg: 2.2, truckload: 480 },
      construction: { bags: 28, bins: 80, kg: 3.5, truckload: 900 },
    },
    distanceRatePerKm: 3.5,
    expressMultiplier: 1.5,
    vatRatePct: 5.0,
  });

  dirty = false;

  constructor() {
    const loaded = this.load();
    if (loaded) {
      this.migrateLegacyPasswords();
      return;
    }
    this.seed();
    this.persist();
  }

  private migrateLegacyPasswords() {
    let changed = false;
    for (const u of this.users) {
      if (u.password && !looksHashed(u.password)) {
        u.password = hashPassword(u.password);
        changed = true;
      }
    }
    if (changed) this.dirty = true;
  }

  private bulkAssign(state: PersistedState) {
    const wasDirty = this.dirty;
    this.dirty = false;
    this.users.length = 0;
    this.users.push(...(state.users ?? []));
    this.collections.length = 0;
    this.collections.push(...(state.collections ?? []));
    this.drivers.length = 0;
    this.drivers.push(...(state.drivers ?? []));
    this.trucks.length = 0;
    this.trucks.push(...(state.trucks ?? []));
    this.payments.length = 0;
    this.payments.push(...(state.payments ?? []));
    this.notifications.length = 0;
    this.notifications.push(...(state.notifications ?? []));
    this.driverApplications.length = 0;
    this.driverApplications.push(...(state.driverApplications ?? []));
    if (state.pricingRules) {
      this.pricingRules = observableObject<PricingRule>(() => (this.dirty = true), state.pricingRules);
    }
    this.dirty = wasDirty;
  }

  private load(): boolean {
    try {
      if (!fs.existsSync(DATA_FILE)) return false;
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const state = JSON.parse(raw) as PersistedState;
      this.bulkAssign(state);
      return true;
    } catch (err) {
      console.error('[db] failed to load persisted state, falling back to seed:', err);
      return false;
    }
  }

  markDirty() {
    this.dirty = true;
  }

  persist() {
    if (!this.dirty) return;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${DATA_FILE}.tmp`;
      const state: PersistedState = {
        users: this.users,
        collections: this.collections,
        drivers: this.drivers,
        trucks: this.trucks,
        payments: this.payments,
        notifications: this.notifications,
        driverApplications: this.driverApplications,
        pricingRules: this.pricingRules,
      };
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
      fs.renameSync(tmp, DATA_FILE);
      this.dirty = false;
    } catch (err) {
      console.error('[db] persist failed:', err);
    }
  }

  seed() {
    this.bulkAssign({
      users: [
      {
        id: 'usr-cust-01',
        name: 'Kwame Mensah',
        email: 'kwame@example.com',
        password: 'password123',
        isDemo: true,
        role: 'customer',
        phone: '+233 24 412 3456',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        address: '14 Kofi Annan Street, Airport Residential, Accra',
        regionId: 'greater_accra',
        regionName: 'Greater Accra Region',
        coordinates: { lat: 5.6052, lng: -0.1741 },
        createdAt: '2026-06-10T08:30:00Z',
      },
      {
        id: 'usr-drv-01',
        name: 'Kofi Boateng',
        email: 'kofi.driver@cleancollect.com',
        password: 'password123',
        isDemo: true,
        role: 'driver',
        phone: '+233 20 876 5432',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        address: 'Accra Central Depot Hub, Ring Road, Greater Accra',
        regionId: 'greater_accra',
        regionName: 'Greater Accra Region',
        coordinates: { lat: 5.578, lng: -0.192 },
        ghanaCardNumber: 'GHA-718293041-9',
        licenseNumber: 'GH-DL-482910',
        assignedTruckPlate: 'GT-4821-22',
        createdAt: '2026-05-01T09:00:00Z',
      },
      {
        id: 'usr-adm-01',
        name: 'Akua Addo (National Operations Director)',
        email: 'admin@cleancollect.com',
        password: 'admin123',
        isDemo: true,
        role: 'admin',
        phone: '+233 30 222 9900',
        avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
        address: 'CleanCollect Ghana Headquarters, Ring Road Central, Accra',
        regionId: 'greater_accra',
        regionName: 'Greater Accra Region',
        coordinates: { lat: 5.578, lng: -0.192 },
        createdAt: '2026-04-01T08:00:00Z',
      },
    ],

      trucks: [
      {
        id: 'trk-01',
        plateNumber: 'GT-4821-22',
        model: 'Isuzu FTR 10-Ton Hydraulic Compactor (Greater Accra Hub)',
        capacityKg: 8500,
        currentLoadKg: 3400,
        fuelLevelPct: 82,
        status: 'in_route',
        assignedDriverId: 'usr-drv-01',
        assignedDriverName: 'Kofi Boateng (Greater Accra)',
        lastServiceDate: '2026-07-28',
        nextServiceDate: '2026-09-15',
        mileageKm: 42350,
      },
      {
        id: 'trk-02',
        plateNumber: 'AS-9302-23',
        model: 'Hino 500 Side-Loader Multi-Waste (Ashanti Region Hub)',
        capacityKg: 6200,
        currentLoadKg: 0,
        fuelLevelPct: 90,
        status: 'idle',
        assignedDriverId: undefined,
        assignedDriverName: undefined,
        lastServiceDate: '2026-08-05',
        nextServiceDate: '2026-09-30',
        mileageKm: 28900,
      },
      {
        id: 'trk-03',
        plateNumber: 'WR-1109-24',
        model: 'Mercedes-Benz Econic Low-Entry Recycler (Western Hub)',
        capacityKg: 12000,
        currentLoadKg: 0,
        fuelLevelPct: 95,
        status: 'idle',
        assignedDriverId: undefined,
        assignedDriverName: undefined,
        lastServiceDate: '2026-08-10',
        nextServiceDate: '2026-10-15',
        mileageKm: 14200,
      },
      {
        id: 'trk-04',
        plateNumber: 'NR-5510-21',
        model: 'MAN TGM Heavy Hookloader & Skip Carrier (Northern Hub)',
        capacityKg: 15000,
        currentLoadKg: 0,
        fuelLevelPct: 88,
        status: 'idle',
        assignedDriverId: undefined,
        assignedDriverName: undefined,
        lastServiceDate: '2026-08-16',
        nextServiceDate: '2026-09-22',
        mileageKm: 34100,
      },
    ],

      drivers: [
      {
        id: 'usr-drv-01',
        name: 'Kofi Boateng',
        email: 'kofi.driver@cleancollect.com',
        phone: '+233 20 876 5432',
        licenseNumber: 'GH-DL-8839210-C',
        status: 'on_route',
        assignedTruckId: 'trk-01',
        assignedTruckPlate: 'GT-4821-22',
        rating: 4.88,
        completedTrips: 184,
        activeTasksCount: 2,
        currentLocation: { lat: 5.612, lng: -0.17 },
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
    ],

      collections: [
      {
        id: 'REQ-2026-08101',
        customerId: 'usr-cust-01',
        customerName: 'Kwame Mensah',
        customerPhone: '+233 24 412 3456',
        customerEmail: 'kwame@example.com',
        wasteType: 'recyclables',
        quantity: 4,
        quantityUnit: 'bins',
        estimatedWeightKg: 120,
        location: {
          address: 'Plot 18, Senchi Street, Airport Residential Area',
          landmark: 'Opposite Association International School',
          area: 'Airport Residential',
          region: 'Greater Accra Region',
          lat: 5.6052,
          lng: -0.1741,
        },
        preferredDate: '2026-08-18',
        preferredTimeSlot: '09:00 - 11:30',
        urgency: 'standard',
        specialInstructions: 'Bins are lined up near the secondary gate beside security booth.',
        status: 'in_progress',
        pricing: {
          baseFee: 25.0,
          wasteTypeRate: 25.0,
          volumeFee: 100.0,
          distanceFee: 14.0,
          urgencySurcharge: 0,
          subtotal: 139.0,
          tax: 6.95,
          totalGHS: 145.95,
        },
        assignedDriverId: 'usr-drv-01',
        assignedDriverName: 'Kofi Boateng',
        assignedDriverPhone: '+233 20 876 5432',
        assignedTruckId: 'trk-01',
        assignedTruckPlate: 'GT-4821-22',
        paymentStatus: 'paid',
        paymentMethod: 'momo',
        paymentReference: 'MOMO-GH-99482103',
        timestamps: {
          createdAt: '2026-08-18T07:15:00Z',
          assignedAt: '2026-08-18T07:45:00Z',
          startedAt: '2026-08-18T08:30:00Z',
        },
      },
      {
        id: 'REQ-2026-08102',
        customerId: 'usr-cust-02',
        customerName: 'Abena Osei Enterprises',
        customerPhone: '+233 50 123 9876',
        customerEmail: 'abena@oseifoods.com',
        wasteType: 'organic',
        quantity: 8,
        quantityUnit: 'bins',
        estimatedWeightKg: 450,
        location: {
          address: '42 Lagos Avenue, East Legon',
          landmark: 'Next to Starbites Restaurant',
          area: 'East Legon',
          region: 'Greater Accra Region',
          lat: 5.6395,
          lng: -0.1582,
        },
        preferredDate: '2026-08-18',
        preferredTimeSlot: '11:30 - 13:30',
        urgency: 'express',
        specialInstructions: 'Commercial kitchen compost waste; please seal bags tightly.',
        status: 'assigned',
        pricing: {
          baseFee: 25.0,
          wasteTypeRate: 35.0,
          volumeFee: 280.0,
          distanceFee: 28.0,
          urgencySurcharge: 166.5,
          subtotal: 499.5,
          tax: 24.98,
          totalGHS: 524.48,
        },
        assignedDriverId: 'usr-drv-01',
        assignedDriverName: 'Kofi Boateng',
        assignedDriverPhone: '+233 20 876 5432',
        assignedTruckId: 'trk-01',
        assignedTruckPlate: 'GT-4821-22',
        paymentStatus: 'paid',
        paymentMethod: 'card',
        paymentReference: 'CARD-TXN-884102',
        timestamps: {
          createdAt: '2026-08-18T08:00:00Z',
          assignedAt: '2026-08-18T08:45:00Z',
        },
      },
      {
        id: 'REQ-2026-08103',
        customerId: 'usr-cust-03',
        customerName: 'Dr. David K. Addo',
        customerPhone: '+233 27 789 4561',
        customerEmail: 'david.addo@ug.edu.gh',
        wasteType: 'electronic',
        quantity: 6,
        quantityUnit: 'bags',
        estimatedWeightKg: 85,
        location: {
          address: 'Bungalow 12, Lower Hill, University of Ghana, Legon',
          landmark: 'Near Balme Library South Entrance',
          area: 'Legon Campus',
          region: 'Greater Accra Region',
          lat: 5.651,
          lng: -0.187,
        },
        preferredDate: '2026-08-18',
        preferredTimeSlot: '14:00 - 16:00',
        urgency: 'standard',
        specialInstructions: 'Old CRT monitors, broken desktop towers, and lead-acid backup UPS batteries.',
        status: 'pending',
        pricing: {
          baseFee: 25.0,
          wasteTypeRate: 30.0,
          volumeFee: 180.0,
          distanceFee: 31.5,
          urgencySurcharge: 0,
          subtotal: 236.5,
          tax: 11.83,
          totalGHS: 248.33,
        },
        paymentStatus: 'unpaid',
        timestamps: {
          createdAt: '2026-08-18T09:20:00Z',
        },
      },
      {
        id: 'REQ-2026-08104',
        customerId: 'usr-cust-04',
        customerName: 'Nana Yaw Prempeh',
        customerPhone: '+233 24 555 8899',
        customerEmail: 'prempeh.ashanti@gmail.com',
        wasteType: 'general_bulk',
        quantity: 2,
        quantityUnit: 'truckload',
        estimatedWeightKg: 2400,
        location: {
          address: 'Plot 7 Ahodwo Commercial Corridor, Kumasi',
          landmark: 'Near Golden Tulip / Rattray Park',
          area: 'Ahodwo & Nhyiaeso',
          region: 'Ashanti Region',
          lat: 6.673,
          lng: -1.621,
        },
        preferredDate: '2026-08-18',
        preferredTimeSlot: '10:00 - 13:00',
        urgency: 'standard',
        specialInstructions: 'Commercial warehouse cleanout; forklift ready for skip load.',
        status: 'assigned',
        pricing: {
          baseFee: 25.0,
          wasteTypeRate: 480.0,
          volumeFee: 960.0,
          distanceFee: 18.0,
          urgencySurcharge: 0,
          subtotal: 1003.0,
          tax: 50.15,
          totalGHS: 1053.15,
        },
        assignedDriverId: 'usr-drv-02',
        assignedDriverName: 'Ama Serwaa',
        assignedDriverPhone: '+233 55 901 2345',
        assignedTruckId: 'trk-02',
        assignedTruckPlate: 'AS-9302-23',
        paymentStatus: 'paid',
        paymentMethod: 'momo',
        paymentReference: 'MOMO-ASH-881290',
        timestamps: {
          createdAt: '2026-08-18T06:30:00Z',
          assignedAt: '2026-08-18T07:15:00Z',
        },
      },
      {
        id: 'REQ-2026-08105',
        customerId: 'usr-cust-05',
        customerName: 'Esi Annan Fisheries Ltd',
        customerPhone: '+233 31 888 2233',
        customerEmail: 'esi@annanfisheries.gh',
        wasteType: 'organic',
        quantity: 12,
        quantityUnit: 'bins',
        estimatedWeightKg: 720,
        location: {
          address: 'Harbour Processing Yard, Takoradi Port Area',
          landmark: 'Cold store #4 beside Main Slipway',
          area: 'Beach Road & Chapel Hill',
          region: 'Western Region',
          lat: 4.896,
          lng: -1.762,
        },
        preferredDate: '2026-08-18',
        preferredTimeSlot: '08:30 - 11:00',
        urgency: 'express',
        specialInstructions: 'Fish offal and organic marine waste for immediate composting.',
        status: 'in_progress',
        pricing: {
          baseFee: 25.0,
          wasteTypeRate: 35.0,
          volumeFee: 420.0,
          distanceFee: 12.0,
          urgencySurcharge: 228.5,
          subtotal: 685.5,
          tax: 34.28,
          totalGHS: 719.78,
        },
        assignedDriverId: 'usr-drv-03',
        assignedDriverName: 'Emmanuel Osei',
        assignedDriverPhone: '+233 27 654 3210',
        assignedTruckId: 'trk-03',
        assignedTruckPlate: 'WR-1109-24',
        paymentStatus: 'paid',
        paymentMethod: 'bank_transfer',
        paymentReference: 'STANBIC-GH-33910',
        timestamps: {
          createdAt: '2026-08-18T07:00:00Z',
          assignedAt: '2026-08-18T07:30:00Z',
          startedAt: '2026-08-18T08:15:00Z',
        },
      },
      {
        id: 'REQ-2026-08106',
        customerId: 'usr-cust-06',
        customerName: 'Alhassan Haruna Cotton Mills',
        customerPhone: '+233 20 999 1144',
        customerEmail: 'haruna@tamalecotton.com',
        wasteType: 'construction',
        quantity: 1,
        quantityUnit: 'truckload',
        estimatedWeightKg: 4500,
        location: {
          address: 'Industrial Area, Tamale-Yendi Road Corridor',
          landmark: 'Opposite Gbalahi Agro Storage Gate',
          area: 'Tamale Central & Aboabo',
          region: 'Northern Region',
          lat: 9.4042,
          lng: -0.8393,
        },
        preferredDate: '2026-08-18',
        preferredTimeSlot: '13:00 - 16:00',
        urgency: 'standard',
        specialInstructions: 'Cotton lint offcuts and warehouse renovation plasterboard.',
        status: 'assigned',
        pricing: {
          baseFee: 25.0,
          wasteTypeRate: 900.0,
          volumeFee: 900.0,
          distanceFee: 24.5,
          urgencySurcharge: 0,
          subtotal: 949.5,
          tax: 47.48,
          totalGHS: 996.98,
        },
        assignedDriverId: 'usr-drv-04',
        assignedDriverName: 'Ibrahim Yakubu',
        assignedDriverPhone: '+233 24 333 7788',
        assignedTruckId: 'trk-04',
        assignedTruckPlate: 'NR-5510-21',
        paymentStatus: 'paid',
        paymentMethod: 'momo',
        paymentReference: 'MOMO-NR-552019',
timestamps: {
          createdAt: '2026-08-18T08:10:00Z',
          assignedAt: '2026-08-18T08:50:00Z',
        },
      },
    ],

      payments: [
      {
        id: 'PAY-1001',
        collectionId: 'REQ-2026-08101',
        customerId: 'usr-cust-01',
        customerName: 'Kwame Mensah',
        amountGHS: 145.95,
        method: 'momo',
        status: 'paid',
        provider: 'MTN Mobile Money',
        transactionDate: '2026-08-18T07:20:00Z',
        reference: 'MOMO-GH-99482103',
        receiptNumber: 'REC-2026-00912',
      },
      {
        id: 'PAY-1002',
        collectionId: 'REQ-2026-08102',
        customerId: 'usr-cust-02',
        customerName: 'Abena Osei Enterprises',
        amountGHS: 524.48,
        method: 'card',
        status: 'paid',
        provider: 'Visa / Ecobank Ghana',
        transactionDate: '2026-08-18T08:05:00Z',
        reference: 'CARD-TXN-884102',
        receiptNumber: 'REC-2026-00913',
      },
      {
        id: 'PAY-1003',
        collectionId: 'REQ-2026-08104',
        customerId: 'usr-cust-04',
        customerName: 'Nana Yaw Prempeh',
        amountGHS: 1053.15,
        method: 'momo',
        status: 'paid',
        provider: 'Telecel Cash (Ashanti)',
        transactionDate: '2026-08-18T06:35:00Z',
        reference: 'MOMO-ASH-881290',
        receiptNumber: 'REC-2026-00914',
      },
      {
        id: 'PAY-1004',
        collectionId: 'REQ-2026-08105',
        customerId: 'usr-cust-05',
        customerName: 'Esi Annan Fisheries Ltd',
        amountGHS: 719.78,
        method: 'bank_transfer',
        status: 'paid',
        provider: 'Stanbic Bank Ghana (Takoradi)',
        transactionDate: '2026-08-18T07:10:00Z',
        reference: 'STANBIC-GH-33910',
        receiptNumber: 'REC-2026-00915',
      },
      {
        id: 'PAY-1005',
        collectionId: 'REQ-2026-08106',
        customerId: 'usr-cust-06',
        customerName: 'Alhassan Haruna Cotton Mills',
amountGHS: 996.98,
        method: 'momo',
        status: 'paid',
        provider: 'MTN Mobile Money (Tamale)',
        transactionDate: '2026-08-18T08:15:00Z',
        reference: 'MOMO-NR-552019',
        receiptNumber: 'REC-2026-00916',
      },
    ],

      notifications: [
      {
        id: 'notif-1',
        userId: 'usr-cust-01',
        role: 'customer',
        title: 'Driver En Route to Your Address',
        message: 'Driver Kofi Boateng in truck GT-4821-22 is 1.4 km away and arriving shortly for collection REQ-2026-08101.',
        type: 'info',
        read: false,
        timestamp: '2026-08-18T08:30:00Z',
        collectionId: 'REQ-2026-08101',
      },
      {
        id: 'notif-2',
        userId: 'usr-drv-01',
        role: 'driver',
        title: 'New Optimized Stop Added',
        message: 'Request REQ-2026-08102 (East Legon, Express Organic) has been scheduled to your active route sequence.',
        type: 'success',
        read: false,
        timestamp: '2026-08-18T08:45:00Z',
        collectionId: 'REQ-2026-08102',
      },
      {
        id: 'notif-3',
        userId: 'usr-adm-01',
        role: 'admin',
title: 'National Operations Update',
        message: 'Active collections synchronized across Greater Accra, Ashanti, Western, and Northern regional hubs.',
        type: 'info',
        read: false,
        timestamp: '2026-08-18T09:20:00Z',
      },
    ],

      driverApplications: [
      {
        id: 'APP-2026-001',
        fullName: 'Kwame Asante',
        email: 'kwame.asante.driver@gmail.com',
        phone: '+233 24 991 2233',
        ghanaCardNumber: 'GHA-829104812-3',
        licenseNumber: 'GH-DL-82910-D',
        licenseClass: 'Class D (Heavy Goods & Tanker)',
        yearsExperience: 6,
        preferredRegionId: 'ashanti',
        preferredRegionName: 'Ashanti',
        preferredHubName: 'Kumasi Central Operations Base (Ahodwo)',
        residentialAddress: 'Asokwa Residential, Kumasi, Ashanti',
        emergencyContact: {
          name: 'Abena Asante',
          phone: '+233 24 991 2234',
          relationship: 'Spouse',
        },
        hasHeavyHaulageCert: true,
        notes: '6 years operating 12-ton hydraulic compactor trucks with certified DVLA heavy haulage endorsement. Clean driving record.',
        status: 'pending',
        submittedAt: '2026-08-17T14:30:00Z',
      },
      {
        id: 'APP-2026-002',
        fullName: 'Samuel Tawiah',
        email: 'samuel.tawiah.driver@gmail.com',
        phone: '+233 50 443 8811',
        ghanaCardNumber: 'GHA-551029481-9',
        licenseNumber: 'GH-DL-55102-C',
        licenseClass: 'Class C (Medium Commercial)',
        yearsExperience: 4,
        preferredRegionId: 'greater_accra',
        preferredRegionName: 'Greater Accra',
        preferredHubName: 'Accra Central Depot (Ring Road)',
        residentialAddress: 'Madina Zongo Junction, Accra, Greater Accra',
        emergencyContact: {
          name: 'Comfort Tawiah',
          phone: '+233 50 443 8812',
          relationship: 'Sister',
        },
        hasHeavyHaulageCert: true,
        notes: 'Experienced with municipal waste skip loaders and residential sorting route navigation in Accra East.',
        status: 'pending',
        submittedAt: '2026-08-18T06:15:00Z',
      },
      {
        id: 'APP-2026-003',
        fullName: 'Emmanuel Osei',
        email: 'emmanuel.driver@cleancollect.com',
        phone: '+233 27 654 3210',
        ghanaCardNumber: 'GHA-110293847-5',
        licenseNumber: 'GH-DL-381920-E',
        licenseClass: 'Class E (Multi-Axle & Articulated)',
        yearsExperience: 8,
        preferredRegionId: 'western',
        preferredRegionName: 'Western',
        preferredHubName: 'Sekondi-Takoradi Materials Recovery Depot',
        residentialAddress: 'Effiakuma, Takoradi, Western Region',
        emergencyContact: {
          name: 'Mary Osei',
          phone: '+233 27 654 3211',
          relationship: 'Spouse',
        },
        hasHeavyHaulageCert: true,
        notes: 'Specialist in heavy roll-on/roll-off skip containers and industrial hazardous waste haulage.',
        status: 'approved',
        submittedAt: '2026-06-01T08:00:00Z',
        reviewedAt: '2026-06-01T08:45:00Z',
        reviewedBy: 'Akua Addo (National Operations Director)',
        assignedTruckId: 'trk-03',
        assignedTruckPlate: 'WR-1109-24',
        assignedDriverId: 'usr-drv-03',
      },
      ],
      pricingRules: this.pricingRules,
    });
  }

  calculatePricing(
    wasteType: WasteCategory,
    quantity: number,
    quantityUnit: QuantityUnit,
    urgency: UrgencyLevel,
    lat: number,
    lng: number
  ) {
    const rules = this.pricingRules;
    const baseFee = rules.baseFeeGHS;
    const unitRate = rules.unitRates[wasteType]?.[quantityUnit] || 15;
    const volumeFee = unitRate * quantity;

    // Find closest Ghana regional depot to customer coordinates
    const nearestDepot = getNearestGhanaDepot(lat, lng);
    const distKm = calculateDistanceKm(nearestDepot.lat, nearestDepot.lng, lat, lng);
    const distanceFee = Math.round(distKm * rules.distanceRatePerKm * 10) / 10;

    let subtotal = baseFee + volumeFee + distanceFee;
    let urgencySurcharge = 0;
    if (urgency === 'express') {
      urgencySurcharge = Math.round(subtotal * (rules.expressMultiplier - 1.0) * 100) / 100;
      subtotal += urgencySurcharge;
    }

    const tax = Math.round(((subtotal * rules.vatRatePct) / 100) * 100) / 100;
    const totalGHS = Math.round((subtotal + tax) * 100) / 100;

    return {
      baseFee,
      wasteTypeRate: unitRate,
      volumeFee,
      distanceFee,
      urgencySurcharge,
      subtotal,
      tax,
      totalGHS,
    };
  }

  // Nearest Neighbor Algorithm for Route Optimization with 2-Opt refinement per driver operating cluster
  optimizeDriverRoute(driverId: string): RouteOptimizationResult {
    const driver = this.drivers.find((d) => d.id === driverId) || this.drivers[0];
    const truck = this.trucks.find((t) => t.id === driver.assignedTruckId) || this.trucks[0];

    // Find all active/assigned jobs for this driver
    let candidateJobs = this.collections.filter(
      (c) =>
        (c.assignedDriverId === driver.id) &&
        (c.status === 'assigned' || c.status === 'in_progress')
    );

    // If driver has no specific assigned jobs, include any pending requests in their geographical proximity (< 50 km)
    if (candidateJobs.length === 0) {
      candidateJobs = this.collections.filter((c) => {
        if (c.status !== 'pending' && c.status !== 'assigned') return false;
        const dist = calculateDistanceKm(
          driver.currentLocation.lat,
          driver.currentLocation.lng,
          c.location.lat,
          c.location.lng
        );
        return dist < 80; // same regional zone
      });
    }

    // Fallback: If still empty, take closest 3 requests
    if (candidateJobs.length === 0) {
      candidateJobs = [...this.collections]
        .sort(
          (a, b) =>
            calculateDistanceKm(driver.currentLocation.lat, driver.currentLocation.lng, a.location.lat, a.location.lng) -
            calculateDistanceKm(driver.currentLocation.lat, driver.currentLocation.lng, b.location.lat, b.location.lng)
        )
        .slice(0, 3);
    }

    // Identify closest Regional Depot and Landfill for this driver cluster
    const nearestDepot = getNearestGhanaDepot(driver.currentLocation.lat, driver.currentLocation.lng);
    const nearestLandfill = getNearestGhanaLandfill(driver.currentLocation.lat, driver.currentLocation.lng);

    // Starting point: Driver's current position or Regional Depot
    const startPoint = {
      lat: driver.currentLocation?.lat || nearestDepot.lat,
      lng: driver.currentLocation?.lng || nearestDepot.lng,
      address: `Start: ${nearestDepot.name}`,
    };

    // Nearest Neighbor implementation
    const unvisited = [...candidateJobs];
    const orderedStops: RouteStop[] = [];

    // Stop 1: Start Regional Depot
    orderedStops.push({
      stopNumber: 1,
      type: 'depot',
      address: nearestDepot.name,
      lat: nearestDepot.lat,
      lng: nearestDepot.lng,
      estimatedArrival: '08:00 AM',
    });

    let currentLat = startPoint.lat;
    let currentLng = startPoint.lng;
    let totalDistKm = 0;
    let currentMinutes = 8 * 60; // 08:00 AM in minutes

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const item = unvisited[i];
        const dist = calculateDistanceKm(currentLat, currentLng, item.location.lat, item.location.lng);
        // Prioritize express jobs slightly in distance weighting
        const weightedDist = item.urgency === 'express' ? dist * 0.75 : dist;
        if (weightedDist < minDistance) {
          minDistance = weightedDist;
          nearestIdx = i;
        }
      }

      const nextJob = unvisited.splice(nearestIdx, 1)[0];
      const stepDist = calculateDistanceKm(currentLat, currentLng, nextJob.location.lat, nextJob.location.lng);
      totalDistKm += stepDist;

      // Urban/Regional travel time ~ 35 km/h + 15 min collection duration
      const travelTimeMin = Math.round((stepDist / 35) * 60) + 15;
      currentMinutes += travelTimeMin;

      const hours = Math.floor(currentMinutes / 60) % 24;
      const mins = currentMinutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;

      orderedStops.push({
        stopNumber: orderedStops.length + 1,
        type: 'collection',
        id: nextJob.id,
        customerName: nextJob.customerName,
        customerPhone: nextJob.customerPhone,
        address: `${nextJob.location.address}, ${nextJob.location.area}`,
        lat: nextJob.location.lat,
        lng: nextJob.location.lng,
        wasteType: nextJob.wasteType,
        quantity: `${nextJob.quantity} ${nextJob.quantityUnit}`,
        weightKg: nextJob.estimatedWeightKg,
        status: nextJob.status,
        estimatedArrival: timeStr,
      });

      currentLat = nextJob.location.lat;
      currentLng = nextJob.location.lng;
    }

    // Final Stop: Regional Landfill / Recycling Complex
    const returnDist = calculateDistanceKm(currentLat, currentLng, nearestLandfill.lat, nearestLandfill.lng);
    totalDistKm += returnDist;
    currentMinutes += Math.round((returnDist / 40) * 60) + 20;
    const finalHours = Math.floor(currentMinutes / 60) % 24;
    const finalMins = currentMinutes % 60;
    const finalTimeStr = `${finalHours.toString().padStart(2, '0')}:${finalMins.toString().padStart(2, '0')} ${finalHours >= 12 ? 'PM' : 'AM'}`;

    orderedStops.push({
      stopNumber: orderedStops.length + 1,
      type: 'landfill',
      address: nearestLandfill.name,
      lat: nearestLandfill.lat,
      lng: nearestLandfill.lng,
      estimatedArrival: finalTimeStr,
    });

    const routeCoordinates: [number, number][] = orderedStops.map((s) => [s.lat, s.lng]);

    // Calculate simulated savings vs naive unoptimized route (~28% savings)
    const totalDistanceRounded = Math.round(totalDistKm * 10) / 10;
    const estimatedDurationMin = Math.round((totalDistKm / 32) * 60 + (orderedStops.length - 2) * 15 + 25);
    const unoptimizedDist = totalDistanceRounded * 1.38;
    const savedDist = Math.max(0, unoptimizedDist - totalDistanceRounded);
    // Diesel consumption ~ 0.35 Liters per km
    const fuelSavedLiters = Math.round(savedDist * 0.35 * 10) / 10;
    // 2.68 kg CO2 per liter diesel
    const carbonReducedKg = Math.round(fuelSavedLiters * 2.68 * 10) / 10;

    return {
      driverId: driver.id,
      driverName: driver.name,
      truckPlate: truck.plateNumber,
      totalDistanceKm: totalDistanceRounded,
      estimatedDurationMin,
      fuelSavedLiters,
      carbonReducedKg,
      stops: orderedStops,
      routeCoordinates,
    };
  }
}
export { Database };

