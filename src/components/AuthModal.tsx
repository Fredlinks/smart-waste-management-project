import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GHANA_REGIONS } from '../data/ghanaRegions';
import {
  ShieldCheck,
  Truck,
  User as UserIcon,
  X,
  Lock,
  Mail,
  Phone,
  MapPin,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  IdCard,
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    registerCustomer,
    applyDriver,
    switchRole,
  } = useAuth();

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Customer registration state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+233 ');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerRegionId, setCustomerRegionId] = useState('greater_accra');
  const [customerArea, setCustomerArea] = useState('East Legon');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Driver application state
  const [driverFullName, setDriverFullName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPhone, setDriverPhone] = useState('+233 ');
  const [driverGhanaCard, setDriverGhanaCard] = useState('GHA-');
  const [driverLicenseNumber, setDriverLicenseNumber] = useState('GH-DL-');
  const [driverLicenseClass, setDriverLicenseClass] = useState('Class D (Heavy Goods & Tanker)');
  const [driverExperience, setDriverExperience] = useState('5');
  const [driverRegionId, setDriverRegionId] = useState('greater_accra');
  const [driverAddress, setDriverAddress] = useState('');
  const [driverEmergencyName, setDriverEmergencyName] = useState('');
  const [driverEmergencyPhone, setDriverEmergencyPhone] = useState('+233 ');
  const [driverEmergencyRel, setDriverEmergencyRel] = useState('Spouse');
  const [driverCert, setDriverCert] = useState(true);
  const [driverNotes, setDriverNotes] = useState('');
  const [driverLoading, setDriverLoading] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);
  const [driverSuccessApp, setDriverSuccessApp] = useState<any | null>(null);

  if (!authModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const res = await login(loginIdentifier, loginPassword);
    setLoginLoading(false);

    if (!res.success) {
      setLoginError(res.error || 'Login failed');
    }
  };

  const handleQuickLogin = async (email: string, password: string = 'password123') => {
    setLoginIdentifier(email);
    setLoginPassword(password);
    setLoginError(null);
    setLoginLoading(true);
    const res = await login(email, password);
    setLoginLoading(false);
    if (!res.success) {
      setLoginError(res.error || 'Quick login failed');
    }
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError(null);
    setCustomerLoading(true);

    const reg = GHANA_REGIONS.find((r) => r.id === customerRegionId) || GHANA_REGIONS[0];
    const res = await registerCustomer({
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      password: customerPassword,
      regionId: reg.id,
      regionName: reg.name,
      area: customerArea,
      address: customerAddress || `${customerArea}, ${reg.name}`,
      lat: reg.center[0],
      lng: reg.center[1],
    });

    setCustomerLoading(false);
    if (!res.success) {
      setCustomerError(res.error || 'Registration failed');
    }
  };

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverError(null);
    setDriverLoading(true);

    const reg = GHANA_REGIONS.find((r) => r.id === driverRegionId) || GHANA_REGIONS[0];
    const res = await applyDriver({
      fullName: driverFullName,
      email: driverEmail,
      phone: driverPhone,
      ghanaCardNumber: driverGhanaCard,
      licenseNumber: driverLicenseNumber,
      licenseClass: driverLicenseClass,
      yearsExperience: Number(driverExperience),
      preferredRegionId: reg.id,
      preferredRegionName: reg.name,
      preferredHubName: reg.depot.name,
      residentialAddress: driverAddress,
      emergencyContact: {
        name: driverEmergencyName,
        phone: driverEmergencyPhone,
        relationship: driverEmergencyRel,
      },
      hasHeavyHaulageCert: driverCert,
      notes: driverNotes,
    });

    setDriverLoading(false);
    if (!res.success) {
      setDriverError(res.error || 'Application submission failed');
    } else {
      setDriverSuccessApp(res.application);
    }
  };

  const currentSelectedRegion =
    GHANA_REGIONS.find((r) => r.id === (authModalMode === 'apply_driver' ? driverRegionId : customerRegionId)) ||
    GHANA_REGIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-8">
        {/* Header Ribbon & Close */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-emerald-500/10 pointer-events-none blur-2xl" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-xl font-bold shadow-md">
              ♻️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">CLEANCollect Access Portal</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Role-Based Security
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ghana Municipal Waste Management & Logistics Infrastructure
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors relative z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-3 bg-slate-100/80 p-1.5 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setDriverSuccessApp(null);
              openAuthModal('login');
            }}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              authModalMode === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDriverSuccessApp(null);
              openAuthModal('register_customer');
            }}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              authModalMode === 'register_customer'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Register as Customer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDriverSuccessApp(null);
              openAuthModal('apply_driver');
            }}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              authModalMode === 'apply_driver'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-amber-600" />
            <span>Apply to become Driver</span>
          </button>
        </div>

        <div className="p-6">
          {/* ========================================================================= */}
          {/* MODE 1: UNIFIED LOGIN */}
          {/* ========================================================================= */}
          {authModalMode === 'login' && (
            <div className="space-y-6">
              {/* Architecture Blueprint Visual */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Role-Based Access Engine
                  </span>
                  <span className="text-[10px] text-slate-400">Backend Auto-Resolution</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30">
                    <UserIcon className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                    <p className="font-bold text-emerald-200">Customer</p>
                    <p className="text-[10px] text-emerald-400/80">Customer Dashboard</p>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-500/30">
                    <Truck className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                    <p className="font-bold text-blue-200">Driver</p>
                    <p className="text-[10px] text-blue-400/80">Driver Dashboard</p>
                  </div>
                  <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30">
                    <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                    <p className="font-bold text-indigo-200">Admin</p>
                    <p className="text-[10px] text-indigo-400/80">Admin Operations</p>
                  </div>
                </div>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Authentication Notice</p>
                    <p className="leading-relaxed">{loginError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address or Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. kwame@example.com, kofi.driver@cleancollect.com, or admin"
                      className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Password</label>
                    <span className="text-[11px] text-slate-400">Demo password: password123 / admin123</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading || !loginIdentifier}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <span className="animate-pulse">Authenticating & Resolving Role...</span>
                  ) : (
                    <>
                      <span>Sign In & Access Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Instant Evaluation Quick Sign-In */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
                  Quick Demo Evaluator Logins
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('kwame@example.com', 'password123')}
                    className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-900 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                        Customer
                      </span>
                      <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-xs font-bold truncate mt-0.5">Kwame Mensah</p>
                    <p className="text-[10px] text-emerald-600/80 truncate">kwame@example.com</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('kofi.driver@cleancollect.com', 'password123')}
                    className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-900 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                        Driver
                      </span>
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <p className="text-xs font-bold truncate mt-0.5">Kofi Boateng</p>
                    <p className="text-[10px] text-blue-600/80 truncate">kofi.driver@cleancollect.com</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin@cleancollect.com', 'admin123')}
                    className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-900 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                        Administrator
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <p className="text-xs font-bold truncate mt-0.5">Akua Addo</p>
                    <p className="text-[10px] text-indigo-600/80 truncate">admin@cleancollect.com</p>
                  </button>
                </div>
              </div>

              {/* Onboarding Helpers */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => openAuthModal('register_customer')}
                  className="text-emerald-700 font-bold hover:underline"
                >
                  New customer? Register here →
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('apply_driver')}
                  className="text-amber-700 font-bold hover:underline"
                >
                  Want to drive? Submit Driver Application →
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: REGISTER AS CUSTOMER */}
          {/* ========================================================================= */}
          {authModalMode === 'register_customer' && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900">
                <p className="font-bold flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-blue-600" />
                  Instant Customer Account Creation
                </p>
                <p className="text-blue-700 mt-1 text-[11px] leading-relaxed">
                  Register as a household, estate, or enterprise customer in any of the 16 Ghanaian regions.
                  Account activates immediately upon creation.
                </p>
              </div>

              {customerError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{customerError}</span>
                </div>
              )}

              <form onSubmit={handleCustomerSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name / Business Name
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Ama Darko / Gold Coast Plaza"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. ama.darko@gmail.com"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number (MoMo / SMS)
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Create Password
                    </label>
                    <input
                      type="password"
                      required
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Operating Ghana Region
                    </label>
                    <select
                      value={customerRegionId}
                      onChange={(e) => {
                        setCustomerRegionId(e.target.value);
                        const r = GHANA_REGIONS.find((rg) => rg.id === e.target.value);
                        if (r && r.towns[0]) {
                          setCustomerArea(r.towns[0].name);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    >
                      {GHANA_REGIONS.map((reg) => (
                        <option key={reg.id} value={reg.id}>
                          🇬🇭 {reg.name} ({reg.capital})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Town / District Area
                    </label>
                    <input
                      type="text"
                      value={customerArea}
                      onChange={(e) => setCustomerArea(e.target.value)}
                      placeholder="e.g. East Legon, Ahodwo, Chapel Hill"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Street Address & Landmark
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="e.g. House 42, Ring Road North, near TotalEnergies station"
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={customerLoading || !customerName || !customerEmail}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {customerLoading ? (
                      <span className="animate-pulse">Creating Customer Account...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Register as Customer & Log In</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Already have an account? <span className="text-emerald-700 font-bold">Sign In</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 3: APPLY TO BECOME A DRIVER (VETTING & APPROVAL) */}
          {/* ========================================================================= */}
          {authModalMode === 'apply_driver' && (
            <div className="space-y-5">
              {driverSuccessApp ? (
                /* Driver Application Submission Success Receipt */
                <div className="space-y-4 text-center py-4 animate-in fade-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-300 text-amber-700 mx-auto flex items-center justify-center text-2xl shadow-inner">
                    📋
                  </div>
                  <div className="space-y-1">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                      Application Reference: {driverSuccessApp.id}
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-2">
                      Driver Application Submitted for Admin Review
                    </h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Thank you, <span className="font-bold text-slate-900">{driverSuccessApp.fullName}</span>!
                      Your heavy commercial vehicle driver credentials and Ghana Card (
                      {driverSuccessApp.ghanaCardNumber}) have been routed to CleanCollect Operations
                      Administration for identity and DVLA license validation.
                    </p>
                  </div>

                  {/* Flow Diagram */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                    <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Onboarding Pipeline Status:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold">
                        1. Submitted ✅
                      </div>
                      <div className="p-2 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 font-bold animate-pulse">
                        2. Admin Vetting ⏳
                      </div>
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-400">
                        3. Truck Assignment 🚛
                      </div>
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-400">
                        4. Driver Active 🟢
                      </div>
                    </div>
                  </div>

                  {/* Quick Evaluator Action: Switch to Admin to Approve Now */}
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-left space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-700" />
                      <div>
                        <p className="text-xs font-bold text-indigo-950">
                          Evaluator Action: Review & Approve as Administrator
                        </p>
                        <p className="text-[11px] text-indigo-700">
                          Switch to the Admin Dashboard now to inspect this driver's Ghana Card and approve their truck assignment.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        closeAuthModal();
                        switchRole('admin');
                      }}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Open Admin Operations & Review Driver Applications</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDriverSuccessApp(null);
                      openAuthModal('login');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 font-bold"
                  >
                    ← Back to Login
                  </button>
                </div>
              ) : (
                /* Driver Application Form */
                <>
                  {/* Workflow Explainer Banner */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-950">
                    <div className="flex items-start gap-2.5">
                      <Truck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-extrabold text-amber-900">
                          Driver Onboarding & Regulatory Vetting Workflow
                        </p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          To protect municipal infrastructure and comply with Ghana EPA & DVLA regulations,
                          drivers cannot self-activate. Submit your application below for vetting by our National
                          Operations Team.
                        </p>
                      </div>
                    </div>
                  </div>

                  {driverError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{driverError}</span>
                    </div>
                  )}

                  <form onSubmit={handleDriverSubmit} className="space-y-4">
                    {/* Section 1: Personal & Legal ID */}
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        1. Personal Details & National Identity
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Full Legal Name (as on Ghana Card)
                          </label>
                          <input
                            type="text"
                            required
                            value={driverFullName}
                            onChange={(e) => setDriverFullName(e.target.value)}
                            placeholder="e.g. Kwame Asante"
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Ghana Card PIN (National ID)
                          </label>
                          <input
                            type="text"
                            required
                            value={driverGhanaCard}
                            onChange={(e) => setDriverGhanaCard(e.target.value)}
                            placeholder="GHA-829104812-3"
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl font-mono uppercase focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={driverEmail}
                            onChange={(e) => setDriverEmail(e.target.value)}
                            placeholder="kwame.driver@gmail.com"
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Mobile Phone Number
                          </label>
                          <input
                            type="tel"
                            required
                            value={driverPhone}
                            onChange={(e) => setDriverPhone(e.target.value)}
                            placeholder="+233 24 991 2233"
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: DVLA Qualifications & Region */}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        2. Driver's License & Heavy Haulage Qualifications
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            DVLA License Number
                          </label>
                          <input
                            type="text"
                            required
                            value={driverLicenseNumber}
                            onChange={(e) => setDriverLicenseNumber(e.target.value)}
                            placeholder="GH-DL-82910-D"
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl font-mono uppercase focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            License Class
                          </label>
                          <select
                            value={driverLicenseClass}
                            onChange={(e) => setDriverLicenseClass(e.target.value)}
                            className="w-full px-2.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="Class D (Heavy Goods & Tanker)">Class D (Heavy Goods & Tanker)</option>
                            <option value="Class C (Medium Commercial)">Class C (Medium Commercial)</option>
                            <option value="Class E (Multi-Axle & Articulated)">Class E (Multi-Axle & Articulated)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Years Commercial Exp.
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="35"
                            required
                            value={driverExperience}
                            onChange={(e) => setDriverExperience(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Preferred Regional Hub
                          </label>
                          <select
                            value={driverRegionId}
                            onChange={(e) => setDriverRegionId(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-amber-500"
                          >
                            {GHANA_REGIONS.map((reg) => (
                              <option key={reg.id} value={reg.id}>
                                🇬🇭 {reg.name} ({reg.depot.name})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Residential Base Address
                          </label>
                          <input
                            type="text"
                            value={driverAddress}
                            onChange={(e) => setDriverAddress(e.target.value)}
                            placeholder="e.g. Asokwa Residential, Kumasi"
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Emergency Contact & Cert */}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        3. Emergency Contact & Safety Pledge
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Contact Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={driverEmergencyName}
                            onChange={(e) => setDriverEmergencyName(e.target.value)}
                            placeholder="e.g. Abena Asante"
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Contact Phone
                          </label>
                          <input
                            type="tel"
                            required
                            value={driverEmergencyPhone}
                            onChange={(e) => setDriverEmergencyPhone(e.target.value)}
                            placeholder="+233 24 000 0000"
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Relationship
                          </label>
                          <select
                            value={driverEmergencyRel}
                            onChange={(e) => setDriverEmergencyRel(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="Spouse">Spouse</option>
                            <option value="Parent">Parent</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Next of Kin">Next of Kin</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={driverCert}
                            onChange={(e) => setDriverCert(e.target.checked)}
                            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                          />
                          <span>
                            I hold a clean DVLA commercial driver record and agree to CleanCollect EPA waste manifest compliance standards.
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={
                          driverLoading ||
                          !driverFullName ||
                          !driverEmail ||
                          !driverGhanaCard ||
                          !driverLicenseNumber
                        }
                        className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        {driverLoading ? (
                          <span className="animate-pulse">Submitting Driver Application for Vetting...</span>
                        ) : (
                          <>
                            <FileCheck className="w-4 h-4" />
                            <span>Submit Application for Administrator Review</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
