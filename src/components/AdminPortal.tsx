import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStream } from '../context/StreamContext';
import {
  CollectionRequest,
  DashboardMetrics,
  Driver,
  PaymentRecord,
  PricingRule,
  Truck,
  User,
  SaasPlan,
  WasteCategory,
  QuantityUnit,
  DriverApplication,
} from '../types';
import { LeafletMap, MapMarkerItem } from './LeafletMap';
import { ReceiptModal } from './ReceiptModal';
import {
  GHANA_REGIONS,
  getAllGhanaDepots,
  getAllGhanaLandfills,
  GHANA_CENTER,
  GHANA_DEFAULT_ZOOM,
} from '../data/ghanaRegions';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  Truck as TruckIcon,
  Users,
  Settings2,
  CreditCard,
  Building2,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Zap,
  Phone,
  Plus,
  Edit,
  Save,
  Check,
  Globe2,
  FileCheck,
  IdCard,
  UserCheck,
  XCircle,
  Shield,
  ShieldPlus,
  Clock,
  ArrowRight,
  LogIn,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const {
    showToast,
    refreshNotifications,
    driverApplications,
    reviewDriverApplication,
    createAdmin,
    switchUser,
    switchRole,
    allUsers,
  } = useAuth();
  const { drivers: liveDrivers, connected: streamConnected } = useStream();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'map' | 'collections' | 'fleet' | 'drivers' | 'applications' | 'customers' | 'pricing' | 'saas'
  >('overview');

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [collections, setCollections] = useState<CollectionRequest[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule | null>(null);
  const [saasPlans, setSaasPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(false);

  // Regional View Filter
  const [selectedAdminRegion, setSelectedAdminRegion] = useState<string>('all');

  // Filters for Collections Table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [wasteTypeFilter, setWasteTypeFilter] = useState('all');

  // Assignment Modal
  const [assigningReq, setAssigningReq] = useState<CollectionRequest | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');

  // Receipt Modal
  const [receiptCollection, setReceiptCollection] = useState<CollectionRequest | null>(null);

  // Pricing Form State
  const [editedPricing, setEditedPricing] = useState<PricingRule | null>(null);

  // Driver Application Review State
  const [appStatusFilter, setAppStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviewingApp, setReviewingApp] = useState<DriverApplication | null>(null);
  const [assignAppTruckId, setAssignAppTruckId] = useState<string>('');
  const [rejectingApp, setRejectingApp] = useState<DriverApplication | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState<string>('Incomplete DVLA commercial verification');
  const [reviewProcessing, setReviewProcessing] = useState(false);

  // Create Admin Modal State
  const [newAdminOpen, setNewAdminOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('+233 ');
  const [adminRoleLevel, setAdminRoleLevel] = useState<'operations_admin' | 'super_admin' | 'billing_admin'>('operations_admin');
  const [adminRegionId, setAdminRegionId] = useState('greater_accra');

  const pendingApps = driverApplications.filter((a) => a.status === 'pending');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [
        metricsRes,
        collsRes,
        driversRes,
        trucksRes,
        custRes,
        payRes,
        pricingRes,
        saasRes,
      ] = await Promise.all([
        fetch('/api/admin/dashboard'),
        fetch('/api/collections'),
        fetch('/api/admin/drivers'),
        fetch('/api/admin/trucks'),
        fetch('/api/admin/customers'),
        fetch('/api/admin/payments'),
        fetch('/api/admin/pricing'),
        fetch('/api/saas-plans'),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (collsRes.ok) setCollections(await collsRes.json());
      if (driversRes.ok) setDrivers(await driversRes.json());
      if (trucksRes.ok) setTrucks(await trucksRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (payRes.ok) setPayments(await payRes.json());
      if (pricingRes.ok) {
        const rules = await pricingRes.json();
        setPricingRules(rules);
        setEditedPricing(rules);
      }
      if (saasRes.ok) setSaasPlans(await saasRes.json());
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Handle Manual Assignment
  const handleConfirmAssignment = async () => {
    if (!assigningReq || !selectedDriverId) return;
    try {
      const res = await fetch(`/api/collections/${assigningReq.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: selectedDriverId,
          truckId: selectedTruckId || undefined,
        }),
      });
      if (res.ok) {
        showToast(`Assigned ${assigningReq.id} to driver successfully`, 'success');
        setAssigningReq(null);
        await loadAdminData();
        refreshNotifications();
      }
    } catch (err) {
      showToast('Failed to assign driver', 'error');
    }
  };

  // Smart Auto-Dispatch: Automatically match nearest available driver
  const handleAutoDispatch = async (req: CollectionRequest) => {
    // Find available driver with minimum active tasks and matching capacity
    const availableDriver = drivers.find((d) => d.status === 'available') || drivers[0];
    if (!availableDriver) {
      showToast('No drivers currently available for auto-dispatch', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/collections/${req.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: availableDriver.id,
          truckId: availableDriver.assignedTruckId,
        }),
      });
      if (res.ok) {
        showToast(
          `Smart Dispatch: Assigned ${req.id} to ${availableDriver.name} (${availableDriver.assignedTruckPlate || 'GT-4821-22'})`,
          'success'
        );
        await loadAdminData();
        refreshNotifications();
      }
    } catch (err) {
      showToast('Auto-dispatch error', 'error');
    }
  };

  // Save Pricing Rule Changes
  const handleSavePricing = async () => {
    if (!editedPricing) return;
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedPricing),
      });
      if (res.ok) {
        showToast('Pricing engine rules updated successfully', 'success');
        setPricingRules(editedPricing);
      }
    } catch (err) {
      showToast('Failed to save pricing rules', 'error');
    }
  };

  // Driver Application Actions
  const handleApproveApplication = async (app: DriverApplication) => {
    setReviewProcessing(true);
    const chosenTruck = assignAppTruckId || trucks.find((t) => t.status === 'active')?.id || trucks[0]?.id;
    const res = await reviewDriverApplication(app.id, 'approve', chosenTruck);
    setReviewProcessing(false);
    setReviewingApp(null);
    if (res.success) {
      await loadAdminData();
    }
  };

  const handleRejectApplication = async () => {
    if (!rejectingApp) return;
    setReviewProcessing(true);
    const res = await reviewDriverApplication(rejectingApp.id, 'reject', undefined, rejectionReasonText);
    setReviewProcessing(false);
    setRejectingApp(null);
    if (res.success) {
      await loadAdminData();
    }
  };

  const handleCreateNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const reg = GHANA_REGIONS.find((r) => r.id === adminRegionId) || GHANA_REGIONS[0];
    const res = await createAdmin({
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      adminRole: adminRoleLevel,
      region: reg.name,
    });
    if (res.success) {
      setNewAdminOpen(false);
      setAdminName('');
      setAdminEmail('');
      setAdminPhone('+233 ');
      await loadAdminData();
    }
  };

  // Filter collections
  const filteredCollections = collections.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.location.region && c.location.region.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesWaste = wasteTypeFilter === 'all' || c.wasteType === wasteTypeFilter;
    const matchesRegion =
      selectedAdminRegion === 'all' ||
      c.location.region?.toLowerCase().includes(selectedAdminRegion.toLowerCase()) ||
      c.location.address.toLowerCase().includes(selectedAdminRegion.toLowerCase());
    return matchesSearch && matchesStatus && matchesWaste && matchesRegion;
  });

  // Dynamic Map Center & Zoom based on Regional Selection
  const activeRegionObj =
    selectedAdminRegion !== 'all'
      ? GHANA_REGIONS.find((r) => r.id === selectedAdminRegion || r.name.toLowerCase() === selectedAdminRegion.toLowerCase())
      : null;

  const mapCenter: [number, number] = activeRegionObj
    ? activeRegionObj.center
    : GHANA_CENTER;

  const mapZoom: number = activeRegionObj ? activeRegionObj.zoom : GHANA_DEFAULT_ZOOM;

  // Map markers for live operations map across all 16 Ghana regions
  const nationalDepots = getAllGhanaDepots();
  const nationalLandfills = getAllGhanaLandfills();

  const mapMarkers: MapMarkerItem[] = [
    // Regional Depots across Ghana
    ...nationalDepots.map((depot) => ({
      id: `depot-${depot.id}`,
      lat: depot.lat,
      lng: depot.lng,
      title: `Hub: ${depot.name}`,
      type: 'depot' as const,
      description: `Regional Logistics & Material Recovery Facility (${depot.regionName}) - ${depot.address}`,
    })),
    // Regional Landfills & Recycling Plants across Ghana
    ...nationalLandfills.map((landfill) => ({
      id: `landfill-${landfill.id}`,
      lat: landfill.lat,
      lng: landfill.lng,
      title: `Landfill/Plant: ${landfill.name}`,
      type: 'landfill' as const,
      description: `Engineered sanitary landfill & composting facility (${landfill.regionName})`,
    })),
    // Trucks/Drivers (prefer live GPS from SSE stream)
    ...drivers.map((d) => {
      const live = liveDrivers[d.id];
      return {
        id: `drv-${d.id}`,
        lat: live?.lat ?? d.currentLocation.lat,
        lng: live?.lng ?? d.currentLocation.lng,
        title: `Driver: ${d.name}`,
        type: 'driver' as const,
        description: live
          ? `LIVE · ${Math.round(live.speedKph)} km/h · ${live.heading} · ${d.status}`
          : `Status: ${d.status} · Rating: ${d.rating}★`,
        plateNumber: d.assignedTruckPlate || 'GT-4821-22',
      };
    }),
    // Collections
    ...collections.map((c) => ({
      id: `col-${c.id}`,
      lat: c.location.lat,
      lng: c.location.lng,
      title: `${c.id} · ${c.customerName}`,
      status: c.status,
      type: 'customer' as const,
      description: `${c.location.address}, ${c.location.area}${c.location.region ? ` (${c.location.region})` : ''}`,
      wasteType: c.wasteType,
      quantity: `${c.quantity} ${c.quantityUnit}`,
    })),
  ];

  const categoryColors: Record<string, string> = {
    organic: '#84cc16',
    recyclables: '#10b981',
    electronic: '#3b82f6',
    hazardous: '#f43f5e',
    general_bulk: '#f59e0b',
    construction: '#78716c',
  };

  return (
    <div className="space-y-6">
      {/* Admin Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
              Operations Control
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">CleanCollect Headquarters</h2>
          </div>
          <p className="text-xs text-slate-500">
            Real-time urban waste dispatching, fleet management, revenue analytics & dynamic pricing
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 flex-wrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'map'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Live Map</span>
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'collections'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Collections ({collections.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'fleet'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <TruckIcon className="w-3.5 h-3.5" />
            <span>Fleet</span>
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'drivers'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Drivers ({drivers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
              activeTab === 'applications'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Driver Applications</span>
            {pendingApps.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-900 text-white">
                {pendingApps.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pricing'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Pricing Rules</span>
          </button>
          <button
            onClick={() => setActiveTab('saas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'saas'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>SaaS Plans</span>
          </button>
          <button
            onClick={() => setNewAdminOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
            title="Create and provision a verified administrator account"
          >
            <ShieldPlus className="w-3.5 h-3.5" />
            <span>+ Admin</span>
          </button>
        </div>
      </div>

      {/* Driver Vetting Pending Banner on Overview */}
      {pendingApps.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 p-4 rounded-2xl text-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-900/20 text-slate-950 flex items-center justify-center text-xl font-bold">
              ⚠️
            </div>
            <div>
              <p className="font-black text-sm">
                {pendingApps.length} Commercial Driver Application{pendingApps.length > 1 ? 's' : ''} Awaiting Vetting
              </p>
              <p className="text-xs font-medium opacity-90">
                Applicants have submitted Ghana Cards and DVLA heavy vehicle credentials for CleanCollect fleet approval.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('applications')}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
          >
            <FileCheck className="w-4 h-4 text-amber-400" />
            <span>Review & Approve Drivers →</span>
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Key Metrics Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Revenue</span>
              <p className="text-2xl font-black text-slate-900 mt-1">GH₵ {metrics.totalRevenueGHS.toFixed(2)}</p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold mt-2">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+18.4% this week</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Waste Diverted / Collected</span>
              <p className="text-2xl font-black text-emerald-800 mt-1">
                {(metrics.totalWasteCollectedKg / 1000).toFixed(1)} <span className="text-base font-bold">Tons</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">
                {metrics.totalWasteCollectedKg.toLocaleString()} kg verified
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Fleet In Action</span>
              <p className="text-2xl font-black text-blue-800 mt-1">
                {metrics.activeDriversCount} <span className="text-sm font-normal text-slate-500">Drivers</span> ·{' '}
                {metrics.activeTrucksCount} <span className="text-sm font-normal text-slate-500">Trucks</span>
              </p>
              <p className="text-[11px] text-blue-700 mt-2 font-bold">{metrics.activeTrips} active routes en route</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer Satisfaction</span>
              <p className="text-2xl font-black text-amber-500 mt-1">
                ★ {metrics.customerSatisfactionScore} <span className="text-sm text-slate-400">/ 5.0</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-2 font-medium">From 48 verified customer ratings</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Revenue & Collection Volume Trend */}
            <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">7-Day Revenue & Collection Volume Trend</h3>
                  <p className="text-xs text-slate-500">Operational performance in Ghana Cedis (GH₵)</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.weeklyRevenueTrend}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue (GH₵)"
                      stroke="#059669"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Waste Category Breakdown */}
            <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Waste Breakdown by Stream</h3>
                <p className="text-xs text-slate-500">Distribution by weight handled (kg)</p>
              </div>
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.wasteCategoryDistribution}
                      dataKey="weightKg"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {metrics.wasteCategoryDistribution.map((entry) => (
                        <Cell
                          key={`cell-${entry.category}`}
                          fill={categoryColors[entry.category] || '#64748b'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {metrics.wasteCategoryDistribution.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: categoryColors[cat.category] || '#64748b' }}
                    />
                    <span className="capitalize font-bold text-slate-700 truncate">{cat.category}:</span>
                    <span className="text-slate-500">{cat.weightKg} kg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Action Tables: Pending Collections for Dispatch */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Pending Request Dispatch Queue ({metrics.pendingRequests})
                </h3>
                <p className="text-xs text-slate-500">Unassigned customer bookings requiring driver dispatch</p>
              </div>
              <button
                onClick={() => setActiveTab('collections')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                View All Requests →
              </button>
            </div>

            {collections.filter((c) => c.status === 'pending').length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                All customer collection requests are currently assigned and dispatched!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Request ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Waste Category</th>
                      <th className="p-3">Area</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3 text-right">Amount (GH₵)</th>
                      <th className="p-3 text-right">Dispatch Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {collections
                      .filter((c) => c.status === 'pending')
                      .map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/60">
                          <td className="p-3 font-bold text-slate-900">{req.id}</td>
                          <td className="p-3">
                            <p className="font-bold text-slate-900">{req.customerName}</p>
                            <p className="text-[11px] text-slate-500">{req.customerPhone}</p>
                          </td>
                          <td className="p-3">
                            <span className="capitalize font-semibold text-slate-800">
                              {req.wasteType} ({req.quantity} {req.quantityUnit})
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-800">{req.location.area}</td>
                          <td className="p-3">
                            {req.urgency === 'express' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                ⚡ Express
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                Standard
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900">
                            GH₵ {req.pricing.totalGHS.toFixed(2)}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => handleAutoDispatch(req)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Auto-Dispatch</span>
                            </button>
                            <button
                              onClick={() => {
                                setAssigningReq(req);
                                setSelectedDriverId(drivers[0]?.id || '');
                                setSelectedTruckId(trucks[0]?.id || '');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs inline-flex items-center"
                            >
                              Assign Driver
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Nationwide Regional Network Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                    National Logistics Network
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Ghana 16 Administrative Regions Logistics Hubs & Depots
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  100% nationwide coverage with active material recovery transfer stations & engineered landfills
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('map');
                  setSelectedAdminRegion('all');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Explore Nationwide GIS Map</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {GHANA_REGIONS.map((reg) => (
                <div
                  key={reg.id}
                  onClick={() => {
                    setSelectedAdminRegion(reg.id);
                    setActiveTab('map');
                  }}
                  className="p-3.5 rounded-xl border border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer group bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">
                        🇬🇭 {reg.name}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                    </div>
                    <p className="text-[11px] font-medium text-slate-600">Capital: {reg.capital}</p>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 font-mono">
                      🏢 {reg.depot.name}
                    </p>
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{reg.towns.length} Service Districts</span>
                    <span className="text-emerald-700 font-bold group-hover:underline">View Map →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE OPERATIONS MAP */}
      {activeTab === 'map' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                  🇬🇭 Ghana Nationwide GIS
                </span>
                <h3 className="font-extrabold text-base text-slate-900">Live Fleet & Collection Map</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring 16 regional depots, municipal landfills, live driver telematics and collection orders
              </p>
            </div>

            {/* Region Selector for Map */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Region Focus:</span>
              </label>
              <select
                value={selectedAdminRegion}
                onChange={(e) => setSelectedAdminRegion(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
              >
                <option value="all">🇬🇭 Entire Ghana (All 16 Regions)</option>
                {GHANA_REGIONS.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name} ({reg.capital})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Region Switcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedAdminRegion('all')}
              className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-all border ${
                selectedAdminRegion === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Ghana
            </button>
            {GHANA_REGIONS.map((reg) => (
              <button
                key={reg.id}
                onClick={() => setSelectedAdminRegion(reg.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all border ${
                  selectedAdminRegion === reg.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {reg.name}
              </button>
            ))}
          </div>

          {/* Map Legend */}
          <div className="flex items-center gap-4 text-xs flex-wrap bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="font-bold text-slate-700">Map Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-900 inline-block border border-white" />
              <span className="font-medium text-slate-700">Regional Depots (16 Hubs)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-teal-700 inline-block border border-white" />
              <span className="font-medium text-slate-700">Landfills & Treatment</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block border border-white" />
              <span className="font-medium text-slate-700">Active Trucks / Drivers</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block border border-white" />
              <span className="font-medium text-slate-700">In Progress Pickups</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500 inline-block border border-white" />
              <span className="font-medium text-slate-700">Pending Orders</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block border border-white" />
              <span className="font-medium text-slate-700">Completed</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className={`w-2 h-2 rounded-full ${streamConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {streamConnected ? `Live · ${Object.keys(liveDrivers).length} driver(s) tracked` : 'Reconnecting…'}
            </span>
          </div>
          <LeafletMap height="540px" markers={mapMarkers} center={mapCenter} zoom={mapZoom} />
        </div>
      )}

      {/* TAB 3: ALL COLLECTION REQUESTS */}
      {activeTab === 'collections' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Master Collection Records ({filteredCollections.length})
              </h3>
              <p className="text-xs text-slate-500">Nationwide Ghana waste management dispatch records</p>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ID, customer, area, region..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                />
              </div>

              <select
                value={selectedAdminRegion}
                onChange={(e) => setSelectedAdminRegion(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
              >
                <option value="all">All Ghana Regions (16)</option>
                {GHANA_REGIONS.map((reg) => (
                  <option key={reg.id} value={reg.name}>
                    {reg.name} Region
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={wasteTypeFilter}
                onChange={(e) => setWasteTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
              >
                <option value="all">All Waste Types</option>
                <option value="recyclables">Recyclables</option>
                <option value="organic">Organic</option>
                <option value="electronic">E-Waste</option>
                <option value="hazardous">Hazardous</option>
                <option value="general_bulk">General Bulk</option>
                <option value="construction">Construction</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">ID & Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Waste Category</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Assigned Driver</th>
                  <th className="p-3 text-right">Price (GH₵)</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCollections.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">{c.id}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.timestamps.createdAt).toLocaleDateString('en-GB')}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{c.customerName}</p>
                      <p className="text-[11px] text-slate-500">{c.customerPhone}</p>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800 capitalize block">{c.wasteType}</span>
                      <span className="text-[11px] text-slate-500">
                        {c.quantity} {c.quantityUnit} (~{c.completedWeightKg || c.estimatedWeightKg} kg)
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800 block">{c.location.area}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-1">{c.location.address}</span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          c.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800'
                            : c.status === 'assigned'
                            ? 'bg-blue-100 text-blue-800'
                            : c.status === 'failed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      {c.assignedDriverName ? (
                        <div>
                          <p className="font-semibold text-slate-900">{c.assignedDriverName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{c.assignedTruckPlate}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">
                      GH₵ {c.pricing.totalGHS.toFixed(2)}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setReceiptCollection(c)}
                        className="p-1 text-slate-500 hover:text-slate-900"
                        title="View Invoice Receipt"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {c.status === 'pending' && (
                        <button
                          onClick={() => {
                            setAssigningReq(c);
                            setSelectedDriverId(drivers[0]?.id || '');
                            setSelectedTruckId(trucks[0]?.id || '');
                          }}
                          className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px]"
                        >
                          Assign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FLEET & TRUCK MANAGEMENT */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Collection Fleet Inventory ({trucks.length})</h3>
              <p className="text-xs text-slate-500">Live capacity monitoring, telemetry, and maintenance logs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trucks.map((truck) => (
              <div
                key={truck.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-slate-900">{truck.plateNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          truck.status === 'active' || truck.status === 'in_route'
                            ? 'bg-emerald-100 text-emerald-800'
                            : truck.status === 'maintenance'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {truck.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{truck.model}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-600 block">Assigned Driver</span>
                    <span className="text-xs font-bold text-indigo-700">{truck.assignedDriverName || 'Unassigned'}</span>
                  </div>
                </div>

                {/* Capacity & Fuel Meters */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Current Payload:</span>
                    <span>
                      {truck.currentLoadKg} / {truck.capacityKg} kg (
                      {Math.round((truck.currentLoadKg / truck.capacityKg) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (truck.currentLoadKg / truck.capacityKg) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Fuel</span>
                    <span className="font-black text-slate-800">{truck.fuelLevelPct}%</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Odometer</span>
                    <span className="font-black text-slate-800">{truck.mileageKm.toLocaleString()} km</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Next Service</span>
                    <span className="font-black text-slate-800">{truck.nextServiceDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: DRIVERS ROSTER */}
      {activeTab === 'drivers' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Driver Roster & Ratings ({drivers.length})</h3>
              <p className="text-xs text-slate-500">Personnel profiles, license verification, and active assignments</p>
            </div>
            <button
              onClick={() => setActiveTab('applications')}
              className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 transition-colors"
            >
              <FileCheck className="w-4 h-4 text-amber-700" />
              <span>Review Pending Applications ({pendingApps.length})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {drivers.map((drv) => (
              <div key={drv.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={drv.avatar}
                    alt={drv.name}
                    className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{drv.name}</h4>
                    <p className="text-xs text-slate-500">{drv.phone}</p>
                    <span className="text-[10px] font-mono text-slate-400">{drv.licenseNumber}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Status:</span>
                    <span className="font-bold capitalize text-slate-800">{drv.status.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rating:</span>
                    <span className="font-bold text-amber-500">★ {drv.rating} / 5.0</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Assigned Truck:</span>
                    <span className="font-bold text-indigo-700">{drv.assignedTruckPlate || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Trips:</span>
                    <span className="font-bold text-slate-800">{drv.completedTrips}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: DRIVER APPLICATIONS VETTING & APPROVALS */}
      {activeTab === 'applications' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  Commercial Driver Applications ({driverApplications.length})
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                  DVLA & Ghana Card Vetting
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Review applicant credentials, verify heavy commercial licenses, and assign municipal trucks
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setAppStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                    appStatusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {st === 'all'
                    ? `All (${driverApplications.length})`
                    : `${st} (${driverApplications.filter((a) => a.status === st).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Applications List */}
          {driverApplications.filter((a) => appStatusFilter === 'all' || a.status === appStatusFilter).length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No driver applications match the selected status filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {driverApplications
                .filter((a) => appStatusFilter === 'all' || a.status === appStatusFilter)
                .map((app) => (
                  <div
                    key={app.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      app.status === 'pending'
                        ? 'border-amber-300 bg-amber-50/40 shadow-xs'
                        : app.status === 'approved'
                        ? 'border-emerald-200 bg-white'
                        : 'border-slate-200 bg-slate-50/70'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Applicant Identity */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {app.id}
                          </span>
                          <h4 className="font-extrabold text-base text-slate-900">{app.fullName}</h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              app.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : app.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {app.status === 'pending'
                              ? '⏳ Pending Review'
                              : app.status === 'approved'
                              ? '🟢 Approved & Active'
                              : '❌ Rejected'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Submitted: {new Date(app.submittedAt).toLocaleDateString()} at{' '}
                            {new Date(app.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Dossier Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                          <div className="p-2 rounded-xl bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Ghana Card PIN</span>
                            <span className="font-mono font-bold text-slate-900">{app.ghanaCardNumber}</span>
                          </div>

                          <div className="p-2 rounded-xl bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">DVLA License</span>
                            <span className="font-mono font-bold text-slate-900">{app.licenseNumber}</span>
                            <span className="text-[10px] text-slate-500 block truncate">{app.licenseClass}</span>
                          </div>

                          <div className="p-2 rounded-xl bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Commercial Exp.</span>
                            <span className="font-bold text-slate-900">{app.yearsExperience} Years</span>
                            <span className="text-[10px] text-emerald-700 block font-semibold">Heavy Commercial</span>
                          </div>

                          <div className="p-2 rounded-xl bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Regional Hub</span>
                            <span className="font-bold text-slate-900">{app.preferredRegionName}</span>
                            <span className="text-[10px] text-slate-500 block truncate">{app.preferredHubName}</span>
                          </div>
                        </div>

                        {/* Contact & Safety Check */}
                        <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-1">
                          <span>📧 {app.email}</span>
                          <span>📞 {app.phone}</span>
                          {app.emergencyContact && (
                            <span className="text-slate-500">
                              Emergency: {app.emergencyContact.name} ({app.emergencyContact.relationship} · {app.emergencyContact.phone})
                            </span>
                          )}
                          {app.hasHeavyHaulageCert && (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              EPA Safety Manifest Certified
                            </span>
                          )}
                        </div>

                        {app.status === 'approved' && app.assignedTruckPlate && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                            <span>
                              Assigned Fleet Vehicle: <strong className="font-bold">{app.assignedTruckPlate}</strong> (Reviewed by {app.reviewedBy})
                            </span>
                            {/* Test Login Button for Approved Driver */}
                            <button
                              type="button"
                              onClick={() => {
                                const driverUser = allUsers.find((u) => u.email === app.email || u.name === app.fullName);
                                if (driverUser) {
                                  switchUser(driverUser.id);
                                } else {
                                  switchRole('driver');
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>Switch to this Driver's View</span>
                            </button>
                          </div>
                        )}

                        {app.status === 'rejected' && (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                            Rejection Reason: <strong>{app.rejectionReason || 'DVLA qualifications non-conforming'}</strong>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions for pending applications */}
                      {app.status === 'pending' && (
                        <div className="flex lg:flex-col gap-2 shrink-0 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingApp(app);
                              setAssignAppTruckId(trucks.find((t) => t.status === 'active')?.id || trucks[0]?.id || '');
                            }}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Approve & Assign Truck</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRejectingApp(app)}
                            className="px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Decline Application</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: PRICING ENGINE RULES */}
      {activeTab === 'pricing' && editedPricing && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Dynamic Pricing Engine Matrix</h3>
              <p className="text-xs text-slate-500">Configure base callout, per-unit rates, distance multipliers and VAT</p>
            </div>
            <button
              onClick={handleSavePricing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save & Apply Pricing Rules</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">Base Callout Dispatch (GH₵)</label>
              <input
                type="number"
                value={editedPricing.baseFeeGHS}
                onChange={(e) =>
                  setEditedPricing({ ...editedPricing, baseFeeGHS: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-sm text-slate-900"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">Distance Rate (GH₵ / km)</label>
              <input
                type="number"
                step="0.1"
                value={editedPricing.distanceRatePerKm}
                onChange={(e) =>
                  setEditedPricing({ ...editedPricing, distanceRatePerKm: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-sm text-slate-900"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">Express Surcharge Factor</label>
              <input
                type="number"
                step="0.1"
                value={editedPricing.expressMultiplier}
                onChange={(e) =>
                  setEditedPricing({ ...editedPricing, expressMultiplier: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-sm text-slate-900"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">VAT & Municipal Levies (%)</label>
              <input
                type="number"
                step="0.1"
                value={editedPricing.vatRatePct}
                onChange={(e) =>
                  setEditedPricing({ ...editedPricing, vatRatePct: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-sm text-slate-900"
              />
            </div>
          </div>

          {/* Unit Rate Matrix */}
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 mb-3">Unit Rates Matrix by Waste Stream (GH₵)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Waste Category</th>
                    <th className="p-3">Rate per Bag (GH₵)</th>
                    <th className="p-3">Rate per Bin (GH₵)</th>
                    <th className="p-3">Rate per Kg (GH₵)</th>
                    <th className="p-3">Rate per Full Truckload (GH₵)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(Object.keys(editedPricing.unitRates) as WasteCategory[]).map((cat) => (
                    <tr key={cat}>
                      <td className="p-3 font-bold capitalize text-slate-900">{cat.replace('_', ' ')}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={editedPricing.unitRates[cat].bags}
                          onChange={(e) => {
                            const updated = { ...editedPricing.unitRates };
                            updated[cat].bags = Number(e.target.value);
                            setEditedPricing({ ...editedPricing, unitRates: updated });
                          }}
                          className="w-24 px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={editedPricing.unitRates[cat].bins}
                          onChange={(e) => {
                            const updated = { ...editedPricing.unitRates };
                            updated[cat].bins = Number(e.target.value);
                            setEditedPricing({ ...editedPricing, unitRates: updated });
                          }}
                          className="w-24 px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="0.1"
                          value={editedPricing.unitRates[cat].kg}
                          onChange={(e) => {
                            const updated = { ...editedPricing.unitRates };
                            updated[cat].kg = Number(e.target.value);
                            setEditedPricing({ ...editedPricing, unitRates: updated });
                          }}
                          className="w-24 px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={editedPricing.unitRates[cat].truckload}
                          onChange={(e) => {
                            const updated = { ...editedPricing.unitRates };
                            updated[cat].truckload = Number(e.target.value);
                            setEditedPricing({ ...editedPricing, unitRates: updated });
                          }}
                          className="w-28 px-2 py-1 border rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SAAS SUBSCRIPTION PLANS (Proposal Section 16) */}
      {activeTab === 'saas' && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              Commercial SaaS Fleet Subscriptions
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Software-as-a-Service for Waste Management Companies
            </h3>
            <p className="text-xs text-slate-500">
              Transform traditional waste operators into digital smart fleets with route optimization, automated customer dispatch, and mobile payments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {saasPlans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 border transition-all flex flex-col justify-between ${
                  plan.recommended
                    ? 'bg-gradient-to-b from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl ring-2 ring-emerald-500 scale-[1.02]'
                    : 'bg-white text-slate-900 border-slate-200/80 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-extrabold text-base">{plan.name}</h4>
                    {plan.recommended && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-400 text-slate-950">
                        Most Popular
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${plan.recommended ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {plan.description}
                  </p>

                  <div className="my-5">
                    <span className="text-3xl font-black">GH₵ {plan.priceGHS}</span>
                    <span className={`text-xs ${plan.recommended ? 'text-emerald-200' : 'text-slate-400'}`}>
                      /{plan.period}
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            plan.recommended ? 'text-emerald-400' : 'text-emerald-600'
                          }`}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => showToast(`Subscribed to ${plan.name} plan successfully!`, 'success')}
                  className={`mt-6 w-full py-3 rounded-xl font-bold text-xs transition-all ${
                    plan.recommended
                      ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  Activate Company Subscription
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Driver Assignment Modal */}
      {assigningReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                📋
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Assign Driver & Truck</h3>
                <p className="text-xs text-slate-500">
                  {assigningReq.id} · {assigningReq.customerName} ({assigningReq.location.area})
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Driver</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 font-semibold"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.status.toUpperCase()}) · Rating: {d.rating}★ · Truck: {d.assignedTruckPlate || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Vehicle</label>
                <select
                  value={selectedTruckId}
                  onChange={(e) => setSelectedTruckId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 font-semibold"
                >
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.plateNumber} ({t.model}) · Load: {t.currentLoadKg}/{t.capacityKg} kg
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssigningReq(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignment}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                Confirm Dispatch Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Receipt Modal */}
      {receiptCollection && (
        <ReceiptModal
          collection={receiptCollection}
          payment={payments.find((p) => p.collectionId === receiptCollection.id)}
          onClose={() => setReceiptCollection(null)}
        />
      )}

      {/* Driver Application Approval & Vehicle Provisioning Modal */}
      {reviewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Approve Commercial Driver</h3>
                <p className="text-xs text-slate-500">
                  {reviewingApp.fullName} · {reviewingApp.licenseNumber} ({reviewingApp.licenseClass})
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Ghana Card:</span>
                <span className="font-mono font-bold text-slate-900">{reviewingApp.ghanaCardNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Operating Hub:</span>
                <span className="font-bold text-slate-900">
                  {reviewingApp.preferredRegionName} ({reviewingApp.preferredHubName})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Commercial Experience:</span>
                <span className="font-bold text-slate-900">{reviewingApp.yearsExperience} Years</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Assign Municipal Waste Truck from Fleet
              </label>
              <select
                value={assignAppTruckId}
                onChange={(e) => setAssignAppTruckId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold text-xs bg-white"
              >
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.plateNumber} ({t.model}) · Status: {t.status.toUpperCase()} · Load: {t.currentLoadKg}/{t.capacityKg} kg
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Approving will immediately create the driver's active profile, dispatch account credentials, and link them to this vehicle.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewingApp(null)}
                disabled={reviewProcessing}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApproveApplication(reviewingApp)}
                disabled={reviewProcessing}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                {reviewProcessing ? (
                  <span>Provisioning Account...</span>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Confirm Approval & Assign</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Application Rejection Reason Modal */}
      {rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Decline Driver Application</h3>
                <p className="text-xs text-slate-500">{rejectingApp.fullName} ({rejectingApp.licenseNumber})</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">Formal Rejection Reason</label>
              <textarea
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-medium resize-none"
                placeholder="Specify reason for applicant notification..."
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {[
                  'DVLA license class mismatch',
                  'Unverified Ghana Card credentials',
                  'Insufficient commercial haulage experience',
                  'Regional hub capacity reached',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReasonText(reason)}
                    className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingApp(null)}
                disabled={reviewProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectApplication}
                disabled={reviewProcessing}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all"
              >
                {reviewProcessing ? 'Submitting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision New Admin Account Modal */}
      {newAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Provision Administrator Account</h3>
                <p className="text-xs text-slate-500">Internal system administrative credential creation</p>
              </div>
            </div>

            <form onSubmit={handleCreateNewAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Kwame Mensah"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="e.g. kwame.mensah@cleancollect.gov.gh"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admin Role Level</label>
                  <select
                    value={adminRoleLevel}
                    onChange={(e) => setAdminRoleLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-900 bg-white"
                  >
                    <option value="operations_admin">Operations Admin</option>
                    <option value="super_admin">Super Administrator</option>
                    <option value="billing_admin">Billing & Audit Officer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Regional Jurisdiction</label>
                  <select
                    value={adminRegionId}
                    onChange={(e) => setAdminRegionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-900 bg-white"
                  >
                    {GHANA_REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Default password will be initialized to <code>AdminPass2025!</code>. The administrator will be required to update it on initial sign-in.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNewAdminOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <ShieldPlus className="w-4 h-4" />
                  <span>Create Admin Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
