import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStream } from '../context/StreamContext';
import {
  CollectionRequest,
  RouteOptimizationResult,
  Driver,
  Truck,
  RouteStop,
} from '../types';
import { LeafletMap } from './LeafletMap';
import confetti from 'canvas-confetti';
import {
  Truck as TruckIcon,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Clock,
  MapPin,
  Sparkles,
  TrendingUp,
  Fuel,
  Leaf,
  Scale,
  Camera,
  Play,
  RotateCcw,
  Check,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const DriverPortal: React.FC = () => {
  const { currentUser, showToast, refreshNotifications } = useAuth();
  const { drivers: liveDrivers, pushDriverLocation, connected: streamConnected } = useStream();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [truck, setTruck] = useState<Truck | null>(null);
  const [assignedJobs, setAssignedJobs] = useState<CollectionRequest[]>([]);
  const [routeOptimization, setRouteOptimization] = useState<RouteOptimizationResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'in_progress' | 'completed'>('all');
  const [loading, setLoading] = useState(false);

  // Complete Dialog State
  const [completingJob, setCompletingJob] = useState<CollectionRequest | null>(null);
  const [verifiedWeight, setVerifiedWeight] = useState<number>(50);
  const [proofPhoto, setProofPhoto] = useState<string>(
    'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop&q=80'
  );
  const [driverNote, setDriverNote] = useState<string>('');

  // Failed Dialog State
  const [failingJob, setFailingJob] = useState<CollectionRequest | null>(null);
  const [failureReason, setFailureReason] = useState<string>('Customer unavailable / Gate locked');
  const [failureNotes, setFailureNotes] = useState<string>('');

  // Fetch driver data, trucks and assigned collections
  const loadDriverData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [driversRes, trucksRes, collRes, routeRes] = await Promise.all([
        fetch('/api/admin/drivers'),
        fetch('/api/admin/trucks'),
        fetch(`/api/collections`),
        fetch(`/api/route/optimize?driverId=${currentUser.id}`),
      ]);

      if (driversRes.ok && trucksRes.ok && collRes.ok) {
        const driversList: Driver[] = await driversRes.json();
        const trucksList: Truck[] = await trucksRes.json();
        const allColls: CollectionRequest[] = await collRes.json();

        // Match current driver
        const currentDrv = driversList.find((d) => d.id === currentUser.id) || driversList[0];
        setDriver(currentDrv);

        const currentTrk = trucksList.find((t) => t.id === currentDrv.assignedTruckId) || trucksList[0];
        setTruck(currentTrk);

        // Filter collections for this driver
        const myJobs = allColls.filter(
          (c) => c.assignedDriverId === currentDrv.id || (!c.assignedDriverId && c.status === 'pending')
        );
        setAssignedJobs(myJobs);
      }

      if (routeRes.ok) {
        const routeData: RouteOptimizationResult = await routeRes.json();
        setRouteOptimization(routeData);
      }
    } catch (err) {
      console.error('Failed to load driver data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriverData();
  }, [currentUser]);

  // Live GPS simulator: while a job is in_progress, push the driver's position
  // toward the next pending stop every 3s. In production this is replaced by
  // navigator.geolocation.watchPosition from the mobile app.
  const simStateRef = useRef<{ lat: number; lng: number; jobId: string | null; startedAt: number }>({
    lat: 0,
    lng: 0,
    jobId: null,
    startedAt: 0,
  });

  useEffect(() => {
    if (!driver) return;
    const inProgress = assignedJobs.find((j) => j.status === 'in_progress' && j.assignedDriverId === driver.id);
    const live = liveDrivers[driver.id];

    // If we have a live position from the server, use it as our current spot
    if (live) {
      simStateRef.current.lat = live.lat;
      simStateRef.current.lng = live.lng;
    }
    if (!inProgress) {
      simStateRef.current.jobId = null;
      return;
    }
    if (simStateRef.current.jobId !== inProgress.id) {
      simStateRef.current = {
        lat: live?.lat ?? driver.currentLocation?.lat ?? 5.612,
        lng: live?.lng ?? driver.currentLocation?.lng ?? -0.17,
        jobId: inProgress.id,
        startedAt: Date.now(),
      };
    }

    const target = inProgress.location;
    const tick = async () => {
      const s = simStateRef.current;
      const dx = target.lat - s.lat;
      const dy = target.lng - s.lng;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.0008) return; // arrived
      // move ~30% of remaining distance per tick
      const step = 0.3;
      s.lat += dx * step;
      s.lng += dy * step;
      const heading =
        Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'N' : 'S') : dx > 0 ? 'E' : 'W';
      await pushDriverLocation(driver.id, s.lat, s.lng, { speedKph: 28, heading });
    };

    tick();
    const interval = setInterval(tick, 3000);
    return () => clearInterval(interval);
  }, [assignedJobs, driver, liveDrivers, pushDriverLocation]);

  // Start Collection Task
  const handleStartTask = async (jobId: string) => {
    try {
      const res = await fetch(`/api/driver/collections/${jobId}/start`, {
        method: 'PUT',
      });
      if (res.ok) {
        showToast('Task started! Customer notified that you are en route.', 'success');
        await loadDriverData();
        refreshNotifications();
      }
    } catch (err) {
      showToast('Failed to start task', 'error');
    }
  };

  // Complete Collection Task
  const handleConfirmComplete = async () => {
    if (!completingJob) return;
    try {
      const res = await fetch(`/api/driver/collections/${completingJob.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedWeightKg: Number(verifiedWeight),
          proofPhotoUrl: proofPhoto,
          notes: driverNote,
        }),
      });

      if (res.ok) {
        confetti({ particleCount: 70, spread: 60 });
        showToast(`Collection ${completingJob.id} marked as completed!`, 'success');
        setCompletingJob(null);
        await loadDriverData();
        refreshNotifications();
      }
    } catch (err) {
      showToast('Failed to complete collection', 'error');
    }
  };

  // Report Failed Collection
  const handleConfirmFailed = async () => {
    if (!failingJob) return;
    try {
      const res = await fetch(`/api/driver/collections/${failingJob.id}/report-failed`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          failureReason,
          notes: failureNotes,
        }),
      });

      if (res.ok) {
        showToast('Collection marked as failed. Dispatcher notified.', 'warning');
        setFailingJob(null);
        await loadDriverData();
        refreshNotifications();
      }
    } catch (err) {
      showToast('Failed to report issue', 'error');
    }
  };

  const filteredJobs = assignedJobs.filter((job) => {
    if (statusFilter === 'all') return true;
    return job.status === statusFilter;
  });

  const completedCount = assignedJobs.filter((j) => j.status === 'completed').length;
  const activeCount = assignedJobs.filter((j) => j.status === 'assigned' || j.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* Header Profile & Vehicle Metrics */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Driver identity */}
          <div className="md:col-span-4 flex items-center gap-4">
            <img
              src={
                driver?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              }
              alt={driver?.name || 'Driver'}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/30 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-slate-900">{driver?.name || 'Kofi Boateng'}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                  {driver?.status || 'On Route'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">License: {driver?.licenseNumber}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs">
                <span className="font-bold text-amber-500 flex items-center gap-0.5">
                  ★ {driver?.rating || 4.88}
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-bold text-slate-700">{driver?.completedTrips || 184} trips completed</span>
              </div>
            </div>
          </div>

          {/* Assigned Truck & Capacity */}
          <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-4 h-4 text-emerald-600" />
                <span className="font-extrabold text-slate-900">
                  {truck?.plateNumber || 'GT-4821-22'} ({truck?.model?.split(' ')[0] || 'Isuzu'})
                </span>
              </div>
              <span className="font-bold text-slate-600">
                {truck?.currentLoadKg || 3400} / {truck?.capacityKg || 8500} kg
              </span>
            </div>

            {/* Capacity Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(((truck?.currentLoadKg || 3400) / (truck?.capacityKg || 8500)) * 100)
                  )}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>Fuel Level: {truck?.fuelLevelPct || 82}%</span>
              <span>Next Service: {truck?.nextServiceDate || '2026-09-15'}</span>
            </div>
          </div>

          {/* Today Quick Stats */}
          <div className="md:col-span-3 grid grid-cols-2 gap-2 text-center">
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
              <span className="text-xl font-black text-emerald-800">{activeCount}</span>
              <span className="block text-[10px] font-bold text-emerald-700 uppercase">Active Stops</span>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <span className="text-xl font-black text-blue-800">{completedCount}</span>
              <span className="block text-[10px] font-bold text-blue-700 uppercase">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* SMART ROUTE OPTIMIZATION MODULE (Proposal Section 9) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                AI
              </div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                Smart Route Optimization & Turn-by-Turn
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Nearest-Neighbor TSP Algorithm calculates the most fuel-efficient sequence
            </p>
          </div>

          <button
            onClick={loadDriverData}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recalculate Route</span>
          </button>
        </div>

        {/* Route Optimization Metrics Pill Bar */}
        {routeOptimization && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Distance</span>
                <p className="font-black text-sm text-slate-900">{routeOptimization.totalDistanceKm} km</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Est. Duration</span>
                <p className="font-black text-sm text-slate-900">{routeOptimization.estimatedDurationMin} mins</p>
              </div>
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200/70 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Fuel Saved</span>
                <p className="font-black text-sm text-emerald-900">{routeOptimization.fuelSavedLiters} L Diesel</p>
              </div>
            </div>

            <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-200/70 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-200 text-teal-800 flex items-center justify-center shrink-0">
                <Leaf className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">CO2 Reduced</span>
                <p className="font-black text-sm text-teal-900">{routeOptimization.carbonReducedKg} kg</p>
              </div>
            </div>
          </div>
        )}

        {/* Map & Turn-by-Turn Stop Sequence */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Map display */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className={`w-2 h-2 rounded-full ${streamConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {streamConnected ? 'Live tracking active' : 'Reconnecting…'}
              </span>
              {driver && liveDrivers[driver.id] && (
                <span className="font-mono text-[10px] text-slate-500">
                  GPS: {liveDrivers[driver.id].lat.toFixed(4)}, {liveDrivers[driver.id].lng.toFixed(4)} · {Math.round(liveDrivers[driver.id].speedKph)} km/h {liveDrivers[driver.id].heading}
                </span>
              )}
            </div>
            <LeafletMap
              height="380px"
              routeStops={routeOptimization?.stops || []}
              routeCoordinates={routeOptimization?.routeCoordinates || []}
              markers={driver && liveDrivers[driver.id] ? [{
                id: `me-${driver.id}`,
                lat: liveDrivers[driver.id].lat,
                lng: liveDrivers[driver.id].lng,
                title: `🚛 ${driver.name}`,
                description: `You · ${Math.round(liveDrivers[driver.id].speedKph)} km/h`,
                type: 'driver',
                plateNumber: truck?.plateNumber,
              }] : []}
              center={
                driver && liveDrivers[driver.id]
                  ? [liveDrivers[driver.id].lat, liveDrivers[driver.id].lng]
                  : [5.6052, -0.1741]
              }
              zoom={12}
            />
          </div>

          {/* Stop sequence checklist */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              <span className="text-xs font-bold text-slate-700 block mb-1">
                Optimized Waypoint Sequence ({routeOptimization?.stops.length || 0} stops):
              </span>

              {routeOptimization?.stops.map((stop) => (
                <div
                  key={stop.stopNumber}
                  className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2.5 transition-all ${
                    stop.type === 'depot'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : stop.type === 'landfill'
                      ? 'bg-teal-900 text-white border-teal-900'
                      : stop.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200 opacity-75'
                      : 'bg-white text-slate-900 border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                        stop.type === 'depot' || stop.type === 'landfill'
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {stop.stopNumber}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">
                          {stop.type === 'depot'
                            ? '🏢 Start: Depot'
                            : stop.type === 'landfill'
                            ? '♻️ End: Landfill Complex'
                            : stop.customerName}
                        </span>
                        {stop.estimatedArrival && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              stop.type === 'depot' || stop.type === 'landfill'
                                ? 'bg-white/15 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {stop.estimatedArrival}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 line-clamp-1 ${
                          stop.type === 'depot' || stop.type === 'landfill' ? 'text-white/80' : 'text-slate-500'
                        }`}
                      >
                        {stop.address}
                      </p>
                      {stop.wasteType && (
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                          {stop.wasteType} · {stop.quantity}
                        </span>
                      )}
                    </div>
                  </div>

                  {stop.status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Task Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Assigned Collection Tasks</h3>
            <p className="text-xs text-slate-500">
              Manage field collection, execute pickups, record weights, and log proof photos
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {(['all', 'assigned', 'in_progress', 'completed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  statusFilter === filter
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No collection tasks matching status "{statusFilter}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {/* Top line */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{job.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            job.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : job.status === 'assigned'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : job.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {job.status.replace('_', ' ')}
                        </span>
                        {job.urgency === 'express' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ⚡ Express
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">{job.customerName}</h4>
                    </div>

                    <a
                      href={`tel:${job.customerPhone}`}
                      className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-600" />
                      <span>{job.customerPhone}</span>
                    </a>
                  </div>

                  {/* Location & Details */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {job.location.address}, {job.location.area}
                      </span>
                    </div>
                    {job.location.landmark && (
                      <p className="text-[11px] text-slate-500 pl-5">Landmark: {job.location.landmark}</p>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-200/60 text-slate-600">
                      <span>Waste Type: <strong className="text-slate-900 capitalize">{job.wasteType}</strong></span>
                      <span>Quantity: <strong className="text-slate-900">{job.quantity} {job.quantityUnit}</strong></span>
                    </div>
                    {job.specialInstructions && (
                      <p className="text-[11px] bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-200">
                        <strong>Note:</strong> {job.specialInstructions}
                      </p>
                    )}
                  </div>

                  {job.status === 'completed' && job.completedWeightKg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                      <p className="font-bold">✅ Completed & Verified</p>
                      <p className="text-[11px]">Recorded Weight: {job.completedWeightKg} kg</p>
                      {job.driverNotes && <p className="text-[11px] italic">Notes: "{job.driverNotes}"</p>}
                    </div>
                  )}
                </div>

                  {/* Action Buttons Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  {job.status === 'assigned' && (
                    <button
                      onClick={() => handleStartTask(job.id)}
                      className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Route to Location</span>
                    </button>
                  )}

                  {job.status === 'in_progress' && (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        onClick={() => {
                          setCompletingJob(job);
                          setVerifiedWeight(job.estimatedWeightKg);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Waste as Collected</span>
                      </button>

                      <button
                        onClick={() => setFailingJob(job)}
                        className="py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-all"
                      >
                        Report Issue
                      </button>
                    </div>
                  )}

                  {job.status === 'completed' && (
                    <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Job Finished</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {completingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                ⚖️
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Complete Collection Task</h3>
                <p className="text-xs text-slate-500">{completingJob.id} · {completingJob.customerName}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Actual Weighed Weight (Kilograms)
                </label>
                <input
                  type="number"
                  min={1}
                  value={verifiedWeight}
                  onChange={(e) => setVerifiedWeight(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Proof of Collection Photo URL</label>
                <input
                  type="text"
                  value={proofPhoto}
                  onChange={(e) => setProofPhoto(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-mono text-xs bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Driver Completion Notes</label>
                <textarea
                  rows={2}
                  value={driverNote}
                  onChange={(e) => setDriverNote(e.target.value)}
                  placeholder="e.g. 4 bins emptied completely, compound cleaned, receipt signed."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 text-sm bg-white dark:bg-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCompletingJob(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
              >
                Confirm Pickup Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failure Reporting Modal */}
      {failingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                ⚠️
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Report Unsuccessful Collection</h3>
                <p className="text-xs text-slate-500">{failingJob.id} · {failingJob.customerName}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Failure</label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                >
                  <option value="Customer unavailable / Gate locked">Customer unavailable / Gate locked</option>
                  <option value="Road blocked / Inaccessible to truck">Road blocked / Inaccessible to truck</option>
                  <option value="Contaminated / Prohibited hazardous items found">Contaminated / Prohibited hazardous items found</option>
                  <option value="Waste volume significantly exceeds booked capacity">Waste volume significantly exceeds booked capacity</option>
                  <option value="Customer requested rescheduling">Customer requested rescheduling</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Additional Field Notes</label>
                <textarea
                  rows={3}
                  value={failureNotes}
                  onChange={(e) => setFailureNotes(e.target.value)}
                  placeholder="Provide context for dispatch team..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFailingJob(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFailed}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Submit Incident Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
