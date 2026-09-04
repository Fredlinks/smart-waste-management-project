import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStream } from '../context/StreamContext';
import {
  CollectionRequest,
  PaymentRecord,
  WasteCategory,
  QuantityUnit,
  UrgencyLevel,
  PaymentMethod,
  PriceBreakdown,
} from '../types';
import { LeafletMap } from './LeafletMap';
import { ReceiptModal } from './ReceiptModal';
import { GHANA_REGIONS, GhanaRegion, getNearestGhanaDepot, findRegionForLocation } from '../data/ghanaRegions';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Truck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  PlusCircle,
  FileText,
  Star,
  Info,
  Phone,
  Shield,
  Trash2,
  Navigation,
  ArrowRight,
  Flame,
  Zap,
  Building2,
  Globe2,
} from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const { currentUser, showToast, refreshNotifications } = useAuth();
  const { drivers: liveDrivers, statuses: liveStatuses } = useStream();

  const [activeSubTab, setActiveSubTab] = useState<'book' | 'tracking' | 'payments'>('book');
  const [collections, setCollections] = useState<CollectionRequest[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Regional State for Ghana
  const [selectedRegionId, setSelectedRegionId] = useState<string>('greater_accra');
  const currentRegion: GhanaRegion =
    GHANA_REGIONS.find((r) => r.id === selectedRegionId) || GHANA_REGIONS[0];

  // Form State
  const [wasteType, setWasteType] = useState<WasteCategory>('recyclables');
  const [quantity, setQuantity] = useState<number>(2);
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>('bins');
  const [urgency, setUrgency] = useState<UrgencyLevel>('standard');
  const [address, setAddress] = useState('14 Kofi Annan Street, Airport Residential, Accra');
  const [area, setArea] = useState('Airport Residential');
  const [landmark, setLandmark] = useState('Opposite Association International School');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: 5.6052,
    lng: -0.1741,
  });
  const [preferredDate, setPreferredDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('09:00 - 12:00');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo');

  // Nearest depot calculation
  const nearestDepot = getNearestGhanaDepot(selectedCoords.lat, selectedCoords.lng);

  // Dynamic Price Breakdown
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [receiptCollection, setReceiptCollection] = useState<CollectionRequest | null>(null);
  const [ratingModalItem, setRatingModalItem] = useState<CollectionRequest | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');

  const wasteCategoryConfigs: Record<
    WasteCategory,
    { title: string; icon: string; desc: string; color: string; ringColor: string }
  > = {
    recyclables: {
      title: 'Recyclables',
      icon: '♻️',
      desc: 'Plastic bottles, paper, cardboard, cans & glass',
      color: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      ringColor: 'ring-emerald-500',
    },
    organic: {
      title: 'Organic & Food',
      icon: '🍏',
      desc: 'Kitchen scrap, compostable, garden & agricultural waste',
      color: 'bg-lime-50 text-lime-900 border-lime-300',
      ringColor: 'ring-lime-500',
    },
    electronic: {
      title: 'E-Waste',
      icon: '💻',
      desc: 'Old computers, phones, cables, batteries & appliances',
      color: 'bg-blue-50 text-blue-900 border-blue-300',
      ringColor: 'ring-blue-500',
    },
    hazardous: {
      title: 'Hazardous Waste',
      icon: '☣️',
      desc: 'Chemicals, paints, solvents, motor oil & medical waste',
      color: 'bg-rose-50 text-rose-900 border-rose-300',
      ringColor: 'ring-rose-500',
    },
    general_bulk: {
      title: 'General & Bulk',
      icon: '🛋️',
      desc: 'Furniture, mattresses, large domestic items & yard debris',
      color: 'bg-amber-50 text-amber-900 border-amber-300',
      ringColor: 'ring-amber-500',
    },
    construction: {
      title: 'Construction Debris',
      icon: '🧱',
      desc: 'Rubble, tiles, concrete blocks, plaster & building offcuts',
      color: 'bg-stone-50 text-stone-900 border-stone-300',
      ringColor: 'ring-stone-500',
    },
  };

  // Change Region
  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId);
    const reg = GHANA_REGIONS.find((r) => r.id === regionId);
    if (reg) {
      const defaultTown = reg.towns[0] || { name: reg.capital, lat: reg.center[0], lng: reg.center[1] };
      setSelectedCoords({ lat: defaultTown.lat, lng: defaultTown.lng });
      setArea(defaultTown.name);
      setAddress(`${defaultTown.name}, ${reg.name}`);
      showToast(`Selected ${reg.name} Region (Hub: ${reg.depot.name})`, 'info');
    }
  };

  // Fetch collections
  const loadCustomerData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [colRes, payRes] = await Promise.all([
        fetch(`/api/collections?customerId=${currentUser.id}`),
        fetch(`/api/admin/payments`),
      ]);
      if (colRes.ok) {
        const colData = await colRes.json();
        setCollections(colData);
      }
      if (payRes.ok) {
        const payData: PaymentRecord[] = await payRes.json();
        setPayments(payData.filter((p) => p.customerId === currentUser.id));
      }
    } catch (err) {
      console.error('Failed to load collections', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [currentUser]);

  // Re-fetch on any real-time collection-status change so cards stay current
  useEffect(() => {
    const ids = Object.keys(liveStatuses);
    if (ids.length === 0) return;
    const mine = currentUser ? new Set(collections.map((c) => c.id)) : null;
    const relevant = ids.some((id) => !mine || mine.has(id));
    if (relevant) loadCustomerData();
  }, [liveStatuses]);

  // Recalculate price whenever booking options change
  useEffect(() => {
    const calcPrice = async () => {
      try {
        const res = await fetch('/api/collections/calculate-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wasteType,
            quantity,
            quantityUnit,
            urgency,
            lat: selectedCoords.lat,
            lng: selectedCoords.lng,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPriceBreakdown(data);
        }
      } catch (err) {
        console.error('Pricing calculation error', err);
      }
    };
    calcPrice();
  }, [wasteType, quantity, quantityUnit, urgency, selectedCoords]);

  // Handle map click location selection
  const handleMapPinSelected = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
    const detectedRegion = findRegionForLocation(lat, lng);
    if (detectedRegion && detectedRegion.id !== selectedRegionId) {
      setSelectedRegionId(detectedRegion.id);
      showToast(`Pinned in ${detectedRegion.name} (${lat.toFixed(4)}, ${lng.toFixed(4)})`, 'info');
    } else {
      showToast(`Pinned coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'info');
    }
  };

  // Browser Geolocation
  const handleUseCurrentGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setSelectedCoords({ lat, lng });
          const detectedRegion = findRegionForLocation(lat, lng);
          if (detectedRegion) {
            setSelectedRegionId(detectedRegion.id);
            setArea(`${detectedRegion.capital} (GPS)`);
            setAddress(`GPS (${lat.toFixed(4)}, ${lng.toFixed(4)}), ${detectedRegion.name}`);
            showToast(`GPS: Located in ${detectedRegion.name} Region!`, 'success');
          } else {
            setArea('My Detected Location');
            setAddress(`GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
            showToast('GPS Location acquired!', 'success');
          }
        },
        () => {
          showToast('Could not retrieve GPS coordinates. Defaulting to current region.', 'warning');
        }
      );
    }
  };

  // Handle Book Collection
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);

    try {
      const payload = {
        customerId: currentUser.id,
        customerName: currentUser.name,
        customerPhone: currentUser.phone,
        customerEmail: currentUser.email,
        wasteType,
        quantity: Number(quantity),
        quantityUnit,
        estimatedWeightKg:
          quantityUnit === 'kg'
            ? Number(quantity)
            : quantityUnit === 'bins'
            ? Number(quantity) * 30
            : quantityUnit === 'bags'
            ? Number(quantity) * 15
            : Number(quantity) * 1200,
        location: {
          address,
          area,
          landmark,
          lat: selectedCoords.lat,
          lng: selectedCoords.lng,
          region: currentRegion.name,
        },
        preferredDate,
        preferredTimeSlot,
        urgency,
        specialInstructions,
        paymentMethod,
      };

      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newReq = await res.json();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        showToast(`Waste collection request ${newReq.id} booked successfully!`, 'success');
        await loadCustomerData();
        refreshNotifications();
        setActiveSubTab('tracking');
      } else {
        showToast('Failed to submit collection request', 'error');
      }
    } catch (err) {
      showToast('Network error while booking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Request
  const handleCancelRequest = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this collection request?')) return;
    try {
      const res = await fetch(`/api/collections/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer cancelled from portal' }),
      });
      if (res.ok) {
        showToast('Collection request cancelled', 'info');
        loadCustomerData();
      }
    } catch (err) {
      showToast('Failed to cancel request', 'error');
    }
  };

  // Rate Driver
  const handleSubmitRating = async () => {
    if (!ratingModalItem) return;
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: ratingModalItem.id,
          rating: ratingStars,
          feedback: ratingFeedback,
        }),
      });
      if (res.ok) {
        showToast('Thank you for rating your collection service!', 'success');
        setRatingModalItem(null);
        setRatingFeedback('');
        loadCustomerData();
      }
    } catch (err) {
      showToast('Failed to submit rating', 'error');
    }
  };

  const activeCollections = collections.filter(
    (c) => c.status === 'pending' || c.status === 'assigned' || c.status === 'in_progress'
  );
  const pastCollections = collections.filter(
    (c) => c.status === 'completed' || c.status === 'cancelled' || c.status === 'failed'
  );

  return (
    <div className="space-y-6">
      {/* Sub Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Customer Waste Services</h2>
          <p className="text-xs text-slate-500">
            Request on-demand pickups, monitor driver dispatch, and manage verified payments
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('book')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'book'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Book Collection</span>
          </button>
          <button
            onClick={() => setActiveSubTab('tracking')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'tracking'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Active & Past Pickups</span>
            {activeCollections.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] font-extrabold flex items-center justify-center">
                {activeCollections.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('payments')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'payments'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Receipts & Payments</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BOOK COLLECTION REQUEST */}
      {activeSubTab === 'book' && (
        <form onSubmit={handleSubmitBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form Fields */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Waste Category */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">Select Waste Category</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">EPA Certified Classifications</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.keys(wasteCategoryConfigs) as WasteCategory[]).map((cat) => {
                  const cfg = wasteCategoryConfigs[cat];
                  const isSelected = wasteType === cat;
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setWasteType(cat)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? `${cfg.color} ring-2 ${cfg.ringColor} shadow-sm scale-[1.01]`
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="text-2xl mb-1.5">{cfg.icon}</div>
                      <h4 className="font-bold text-xs text-slate-900 leading-snug">{cfg.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {cfg.desc}
                      </p>
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Quantity & Volume */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center">
                    2
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">Estimated Quantity & Container Unit</h3>
                </div>
                <span className="text-xs text-slate-500">
                  Approx. weight:{' '}
                  <strong className="text-emerald-700">
                    {quantityUnit === 'kg'
                      ? quantity
                      : quantityUnit === 'bins'
                      ? quantity * 30
                      : quantityUnit === 'bags'
                      ? quantity * 15
                      : quantity * 1200}{' '}
                    kg
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Container / Unit Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['bins', 'bags', 'kg', 'truckload'] as QuantityUnit[]).map((unit) => (
                      <button
                        type="button"
                        key={unit}
                        onClick={() => setQuantityUnit(unit)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all border ${
                          quantityUnit === unit
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {unit === 'bins'
                          ? '🗑️ Wheelie Bins (240L)'
                          : unit === 'bags'
                          ? '🛍️ Heavy Bags'
                          : unit === 'kg'
                          ? '⚖️ Kilograms (Kg)'
                          : '🚛 Full Truckload'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Amount ({quantityUnit.toUpperCase()})
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={quantityUnit === 'kg' ? 5000 : 50}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-bold text-sm bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                    />
                    <div className="flex items-center gap-1">
                      {[1, 2, 4, 8].map((preset) => (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => setQuantity(preset)}
                          className="px-2.5 py-2 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Location & Interactive Map Pin */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Pickup Location (Nationwide Ghana)</h3>
                    <p className="text-[11px] text-slate-500">Service active in all 16 administrative regions of Ghana</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUseCurrentGPS}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Use My GPS</span>
                </button>
              </div>

              {/* Ghana Region Dropdown & Regional Hub info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Select Ghana Administrative Region (16 Regions)</span>
                  </label>
                  <select
                    value={selectedRegionId}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                  >
                    {GHANA_REGIONS.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        🇬🇭 {reg.name} ({reg.capital})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      Regional Hub: {nearestDepot.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Dispatched from {nearestDepot.regionName} · Assigned Landfill: {currentRegion.landfill.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Area Quick Selector for selected region */}
              <div>
                <span className="text-xs text-slate-500 font-medium block mb-1.5">
                  Key Municipalities / Towns in <strong>{currentRegion.name}</strong>:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentRegion.towns.map((town) => (
                    <button
                      type="button"
                      key={town.name}
                      onClick={() => {
                        setArea(town.name);
                        setSelectedCoords({ lat: town.lat, lng: town.lng });
                        setAddress(`${town.name}, ${currentRegion.name}`);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        area === town.name
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {town.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Street / House Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Plot 12, Kejetia Crescent, Kumasi"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Area / Suburb / Town</label>
                  <input
                    type="text"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Asokwa / Kejetia / Bantama"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghana Digital Address (GhanaPostGPS) or Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. GA-183-9024 or Opposite Shell Station, Green Gate beside market"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                />
              </div>

              {/* Interactive Map */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Interactive Map Pinpoint ({currentRegion.name})
                  </span>
                  <span>
                    Lat: {selectedCoords.lat.toFixed(4)}, Lng: {selectedCoords.lng.toFixed(4)}
                  </span>
                </div>
                <LeafletMap
                  height="220px"
                  allowClickSelection
                  onLocationSelect={handleMapPinSelected}
                  selectedLocation={selectedCoords}
                  center={[selectedCoords.lat, selectedCoords.lng]}
                  zoom={12}
                  regionName={currentRegion.name}
                />
              </div>
            </div>

            {/* Step 4: Schedule, Urgency & Instructions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center">
                  4
                </span>
                <h3 className="font-bold text-sm text-slate-900">Schedule & Urgency</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Pickup Date</label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot Window</label>
                  <select
                    value={preferredTimeSlot}
                    onChange={(e) => setPreferredTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                  >
                    <option value="08:00 - 11:00">Morning (08:00 - 11:00)</option>
                    <option value="11:00 - 14:00">Midday (11:00 - 14:00)</option>
                    <option value="14:00 - 17:00">Afternoon (14:00 - 17:00)</option>
                    <option value="17:00 - 20:00">Evening (17:00 - 20:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Service Priority</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUrgency('standard')}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                        urgency === 'standard'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgency('express')}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                        urgency === 'express'
                          ? 'bg-amber-500 text-slate-900 border-amber-500 font-extrabold shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      Express (1.5x)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Special Driver Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Call 10 minutes before arrival; waste is stacked behind the generator building."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>
          </div>

          {/* Sidebar: Dynamic Price Breakdown & Checkout */}
          <div className="lg:col-span-4 space-y-6">
            {/* Price Calculator Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md space-y-5 sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    GH₵
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Price Estimate</h3>
                    <p className="text-[11px] text-slate-500">Live algorithm calculation</p>
                  </div>
                </div>
                {urgency === 'express' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    ⚡ Express Mode
                  </span>
                )}
              </div>

              {priceBreakdown ? (
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Base Callout & Dispatch</span>
                    <span className="font-semibold text-slate-800">
                      GH₵ {priceBreakdown.baseFee.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <div>
                      <span>
                        {wasteType.toUpperCase()} ({quantity} {quantityUnit})
                      </span>
                    </div>
                    <span className="font-semibold text-slate-800">
                      GH₵ {priceBreakdown.volumeFee.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Logistics & Distance Fee</span>
                    <span className="font-semibold text-slate-800">
                      GH₵ {priceBreakdown.distanceFee.toFixed(2)}
                    </span>
                  </div>

                  {priceBreakdown.urgencySurcharge > 0 && (
                    <div className="flex items-center justify-between text-amber-700 font-bold bg-amber-50 p-2 rounded-lg">
                      <span>Express Emergency Surcharge</span>
                      <span>+GH₵ {priceBreakdown.urgencySurcharge.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100">
                    <span>VAT & Municipal Levies (5%)</span>
                    <span>GH₵ {priceBreakdown.tax.toFixed(2)}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 block">Total Payable</span>
                      <span className="text-[10px] text-slate-400 font-medium">All inclusive</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-700 tracking-tight">
                        GH₵ {priceBreakdown.totalGHS.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                  Calculating real-time rate...
                </div>
              )}

              {/* Payment Method Selector */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-700">Payment Option</label>
                <div className="space-y-2">
                  <label
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'momo'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'momo'}
                        onChange={() => setPaymentMethod('momo')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Mobile Money (Instant)</p>
                        <p className="text-[10px] text-slate-500">MTN MoMo, Telecel Cash, AT Money</p>
                      </div>
                    </div>
                    <span className="text-xs">📱</span>
                  </label>

                  <label
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'card'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'card'}
                        onChange={() => setPaymentMethod('card')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Credit / Debit Card</p>
                        <p className="text-[10px] text-slate-500">Visa, Mastercard, GH-Link</p>
                      </div>
                    </div>
                    <span className="text-xs">💳</span>
                  </label>

                  <label
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'cash'}
                        onChange={() => setPaymentMethod('cash')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Cash on Collection</p>
                        <p className="text-[10px] text-slate-500">Pay directly to collection driver</p>
                      </div>
                    </div>
                    <span className="text-xs">💵</span>
                  </label>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Dispatching Request...</span>
                ) : (
                  <>
                    <span>Confirm & Book Collection</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Traceable Disposal & Certified Recycling</span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: ACTIVE & PAST PICKUPS */}
      {activeSubTab === 'tracking' && (
        <div className="space-y-6">
          {/* Active Orders Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Active Collection Requests ({activeCollections.length})</span>
              </h3>
              <button
                onClick={loadCustomerData}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Refresh Status
              </button>
            </div>

            {activeCollections.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                  🚛
                </div>
                <h4 className="font-bold text-sm text-slate-800">No Active Waste Collections</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You do not have any pending or ongoing pickups right now. Book a collection to get started.
                </p>
                <button
                  onClick={() => setActiveSubTab('book')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors inline-block"
                >
                  Book New Collection
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeCollections.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-4">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{req.id}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                req.status === 'in_progress'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : req.status === 'assigned'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-orange-100 text-orange-800 border border-orange-300'
                              }`}
                            >
                              {req.status.replace('_', ' ')}
                            </span>
                            {req.urgency === 'express' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                ⚡ Express
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Booked on {new Date(req.timestamps.createdAt).toLocaleDateString('en-GB')} · Slot: {req.preferredTimeSlot}
                          </p>
                        </div>
                        <span className="text-base font-black text-emerald-700">
                          GH₵ {req.pricing.totalGHS.toFixed(2)}
                        </span>
                      </div>

                      {/* Waste details */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Waste Category:</span>
                          <span className="font-bold text-slate-800 capitalize">{req.wasteType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Volume:</span>
                          <span className="font-semibold text-slate-800">
                            {req.quantity} {req.quantityUnit} (~{req.estimatedWeightKg} kg)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Pickup Area:</span>
                          <span className="font-semibold text-slate-800">{req.location.area}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 truncate">
                          📍 {req.location.address}
                        </div>
                      </div>

                      {/* Status Tracker Visual Timeline */}
                      <div className="pt-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Collection Progress
                        </p>
                        <div className="grid grid-cols-4 gap-1 text-center">
                          {[
                            { key: 'pending', label: 'Requested' },
                            { key: 'assigned', label: 'Assigned' },
                            { key: 'in_progress', label: 'En Route' },
                            { key: 'completed', label: 'Completed' },
                          ].map((step, idx) => {
                            const isCurrent = req.status === step.key;
                            const isPassed =
                              (req.status === 'assigned' && idx <= 1) ||
                              (req.status === 'in_progress' && idx <= 2) ||
                              (req.status === 'completed' && idx <= 3);

                            return (
                              <div key={step.key} className="space-y-1">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    isPassed || isCurrent ? 'bg-emerald-600' : 'bg-slate-200'
                                  }`}
                                />
                                <span
                                  className={`text-[10px] font-semibold block ${
                                    isCurrent
                                      ? 'text-emerald-800 font-bold'
                                      : isPassed
                                      ? 'text-slate-700'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Driver Details if Assigned */}
                      {req.assignedDriverName ? (
                        <div className="space-y-2.5">
                          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                🚛
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">{req.assignedDriverName}</p>
                                <p className="text-[11px] text-blue-700 font-medium">
                                  Truck: {req.assignedTruckPlate || 'GT-4821-22'}
                                </p>
                              </div>
                            </div>
                            <a
                              href={`tel:${req.assignedDriverPhone || '+233208765432'}`}
                              className="p-2 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call</span>
                            </a>
                          </div>

                          {(req.status === 'assigned' || req.status === 'in_progress') && (() => {
                            const driver = req.assignedDriverId ? liveDrivers[req.assignedDriverId] : undefined;
                            const driverLat = driver?.lat ?? req.location.lat;
                            const driverLng = driver?.lng ?? req.location.lng;
                            const liveMarker = driver
                              ? {
                                  id: `drv-${req.assignedDriverId}`,
                                  lat: driverLat,
                                  lng: driverLng,
                                  title: `🚛 ${req.assignedDriverName}`,
                                  description: driver.speedKph
                                    ? `Live · ${Math.round(driver.speedKph)} km/h · ${driver.heading}`
                                    : 'Live position',
                                  type: 'driver' as const,
                                  plateNumber: req.assignedTruckPlate,
                                }
                              : null;
                            const customerMarker = {
                              id: `pickup-${req.id}`,
                              lat: req.location.lat,
                              lng: req.location.lng,
                              title: '📍 Your Pickup',
                              description: req.location.address,
                              type: 'selected' as const,
                            };
                            return (
                              <div className="rounded-xl overflow-hidden border border-emerald-200 bg-emerald-50/40">
                                <div className="px-3 py-1.5 flex items-center justify-between bg-emerald-100/80 border-b border-emerald-200">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${driver ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                    {driver ? 'Live driver tracking' : 'Awaiting first GPS ping'}
                                  </span>
                                  {driver && (
                                    <span className="text-[10px] font-mono text-emerald-700">
                                      {driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}
                                    </span>
                                  )}
                                </div>
                                <LeafletMap
                                  height="220px"
                                  markers={[customerMarker, ...(liveMarker ? [liveMarker] : [])]}
                                  center={[(driverLat + req.location.lat) / 2, (driverLng + req.location.lng) / 2]}
                                  zoom={12}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                          ⏳ Matching nearest available driver & truck...
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => setReceiptCollection(req)}
                        className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Invoice</span>
                      </button>

                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past History */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900">
              Completed & Past Pickups ({pastCollections.length})
            </h3>

            {pastCollections.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No past collections on record yet.</p>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {pastCollections.map((item) => (
                  <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{item.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-xs text-slate-500 font-medium capitalize">
                          · {item.wasteType} ({item.quantity} {item.quantityUnit})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {item.location.address}, {item.location.area} · Serviced by {item.assignedDriverName || 'CleanCollect Team'}
                      </p>
                      {item.completedWeightKg && (
                        <p className="text-[11px] text-emerald-700 font-semibold">
                          ✅ Verified Weight: {item.completedWeightKg} kg · Total Paid: GH₵ {item.pricing.totalGHS.toFixed(2)}
                        </p>
                      )}
                      {item.rating && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 pt-0.5">
                          <span>Rated: {'★'.repeat(item.rating)}</span>
                          {item.feedback && <span className="text-slate-500 italic">"{item.feedback}"</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'completed' && !item.rating && (
                        <button
                          onClick={() => setRatingModalItem(item)}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 flex items-center gap-1"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>Rate Service</span>
                        </button>
                      )}
                      <button
                        onClick={() => setReceiptCollection(item)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS & INVOICES */}
      {activeSubTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Payment History & Tax Receipts</h3>
              <p className="text-xs text-slate-500">
                All digital transactions are settled in Ghana Cedis (GH₵) with mobile money references
              </p>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Receipt #</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Collection ID</th>
                      <th className="p-3.5">Payment Method</th>
                      <th className="p-3.5">Reference</th>
                      <th className="p-3.5 text-right">Amount (GH₵)</th>
                      <th className="p-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {payments.map((p) => {
                      const matchedCol = collections.find((c) => c.id === p.collectionId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="p-3.5 font-bold text-slate-900">{p.receiptNumber}</td>
                          <td className="p-3.5 text-slate-500">
                            {new Date(p.transactionDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="p-3.5 font-semibold text-emerald-800">{p.collectionId}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium">
                              {p.provider || p.method.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-500">{p.reference}</td>
                          <td className="p-3.5 text-right font-black text-slate-900">
                            GH₵ {p.amountGHS.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => {
                                if (matchedCol) {
                                  setReceiptCollection(matchedCol);
                                } else {
                                  showToast('Generating receipt view...', 'info');
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Official Receipt Invoice */}
      {receiptCollection && (
        <ReceiptModal
          collection={receiptCollection}
          payment={payments.find((p) => p.collectionId === receiptCollection.id)}
          onClose={() => setReceiptCollection(null)}
        />
      )}

      {/* Modal: Service Rating */}
      {ratingModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl">
                🌟
              </div>
              <h3 className="font-extrabold text-base text-slate-900">Rate Your Collection Experience</h3>
              <p className="text-xs text-slate-500">
                How was the service provided for pickup {ratingModalItem.id}?
              </p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRatingStars(star)}
                  className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-hidden"
                >
                  <span className={star <= ratingStars ? 'text-amber-400' : 'text-slate-200'}>★</span>
                </button>
              ))}
            </div>

            {/* Feedback comment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Feedback / Driver Compliment</label>
              <textarea
                rows={3}
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                placeholder="Driver was very polite, arrived promptly and left the bins spotless..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRatingModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRating}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
