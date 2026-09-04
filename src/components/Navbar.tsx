import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useStream } from '../context/StreamContext';
import { UserRole } from '../types';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Truck,
  User,
  ShieldCheck,
  LogIn,
  UserPlus,
  FileCheck,
  LogOut,
  Sparkle,
  Sun,
  Moon,
  Radio,
} from 'lucide-react';

interface NavbarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const {
    currentUser,
    currentRole,
    allUsers,
    notifications,
    driverApplications,
    unreadCount,
    openAuthModal,
    switchRole,
    switchUser,
    logout,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    resetDatabase,
    toast,
  } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { connected: streamConnected } = useStream();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const pendingDriverCount = driverApplications.filter((a) => a.status === 'pending').length;

  const roleConfigs: Record<
    UserRole,
    { label: string; icon: React.ReactNode; badgeColor: string; description: string; pillColor: string }
  > = {
    customer: {
      label: 'Customer Portal',
      icon: <User className="w-4 h-4" />,
      badgeColor: 'bg-emerald-600 text-white',
      pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Book collections, track requests & payments',
    },
    driver: {
      label: 'Driver Portal',
      icon: <Truck className="w-4 h-4" />,
      badgeColor: 'bg-blue-600 text-white',
      pillColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Route optimization, active jobs & pickup execution',
    },
    admin: {
      label: 'Admin Operations',
      icon: <ShieldCheck className="w-4 h-4" />,
      badgeColor: 'bg-indigo-600 text-white',
      pillColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Fleet management, dispatching, pricing & driver vetting',
    },
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
      {/* Toast Alert Banner */}
      {toast && (
        <div
          className={`px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : toast.type === 'warning'
              ? 'bg-amber-500 text-slate-900'
              : 'bg-slate-800 text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center shadow-md text-white font-black text-xl tracking-tighter">
              ♻️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                  CLEAN<span className="text-emerald-600 dark:text-emerald-400">Collect</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                  Smart Waste OS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block">
                Automated Logistics & Role-Based Waste Management
              </p>
            </div>
          </div>

          {/* Role Switcher & Auth Triggers */}
          <div className="flex items-center gap-2">
            {/* Role Pills */}
            <div className="flex items-center p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-inner">
              {(['customer', 'driver', 'admin'] as UserRole[]).map((role) => {
                const isSelected = currentRole === role;
                const cfg = roleConfigs[role];
                return (
                  <button
                    key={role}
                    onClick={() => switchRole(role)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                      isSelected
                        ? `${cfg.badgeColor} shadow-sm scale-[1.02]`
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                    }`}
                    title={cfg.description}
                  >
                    {cfg.icon}
                    <span className="capitalize">{role}</span>
                    {role === 'admin' && pendingDriverCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1 ring-1 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Action buttons */}
            <div className="hidden xl:flex items-center gap-1.5">
              <button
                onClick={() => openAuthModal('register_customer')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-1"
                title="Register a new customer account"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Customer</span>
              </button>

              <button
                onClick={() => openAuthModal('apply_driver')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors flex items-center gap-1"
                title="Submit a driver application for admin approval"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Apply as Driver</span>
              </button>
            </div>
          </div>

          {/* Right actions: Theme toggle, Notifications & User profile */}
          <div className="flex items-center gap-2.5">
            {/* Live stream status indicator */}
            <span
              title={streamConnected ? 'Real-time updates connected' : 'Connecting to real-time stream…'}
              className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                streamConnected
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50'
                  : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50'
              }`}
            >
              <Radio className={`w-3 h-3 ${streamConnected ? 'animate-pulse' : ''}`} />
              {streamConnected ? 'Live' : 'Offline'}
            </span>

            {/* Theme toggle (light / dark) */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle color theme"
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Sign In / Switch Auth Button */}
            <button
              onClick={() => openAuthModal('login')}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
              title="Sign in with credentials or switch account"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Sign In</span>
            </button>

            {/* Reset Seed Demo Data Button */}
            <button
              onClick={resetDatabase}
              title="Reset initial demo data"
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1 hidden lg:flex"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[11px]">Reset</span>
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        No notifications at this time.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationAsRead(notif.id)}
                          className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                            !notif.read ? 'bg-emerald-50/40 dark:bg-emerald-900/20' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h5
                              className={`text-xs font-semibold ${
                                !notif.read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {notif.title}
                            </h5>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                            {new Date(notif.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active User Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200/60 dark:border-slate-700"
              >
                <img
                  src={
                    currentUser?.avatar ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={currentUser?.name || 'User'}
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {currentUser?.name || 'Loading...'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium capitalize flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {currentUser?.role || currentRole}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{currentUser?.name}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          roleConfigs[currentUser?.role || currentRole].pillColor
                        }`}
                      >
                        {currentUser?.role || currentRole}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{currentUser?.email}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{currentUser?.phone}</p>
                    {currentUser?.ghanaCardNumber && (
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                        Ghana Card: {currentUser.ghanaCardNumber}
                      </p>
                    )}
                  </div>

                  {/* Auth Actions */}
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 space-y-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        openAuthModal('login');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <LogIn className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Sign In / Switch Role</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        openAuthModal('register_customer');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Register as Customer</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        openAuthModal('apply_driver');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Apply to become Driver</span>
                    </button>
                  </div>

                  <div className="p-2 text-xs">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Demo User Accounts
                    </p>
                    {allUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                          currentUser?.id === u.id
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="text-xs truncate">{u.name}</p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">{u.role}</span>
                        </div>
                        {currentUser?.id === u.id && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

