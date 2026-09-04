import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StreamProvider } from './context/StreamContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { CustomerPortal } from './components/CustomerPortal';
import { DriverPortal } from './components/DriverPortal';
import { AdminPortal } from './components/AdminPortal';
import { AuthModal } from './components/AuthModal';

const MainAppContent: React.FC = () => {
  const { currentRole } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentRole === 'customer' && <CustomerPortal />}
        {currentRole === 'driver' && <DriverPortal />}
        {currentRole === 'admin' && <AdminPortal />}
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-6 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
              ♻️
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">CLEANCollect Platform</span>
            <span>· Smart Urban Waste Management & Logistics OS</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Certified Environmental Protection Agency (EPA) Manifest Standards · Ghana Metro Infrastructure
          </p>
        </div>
      </footer>

      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StreamProvider>
          <MainAppContent />
        </StreamProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
