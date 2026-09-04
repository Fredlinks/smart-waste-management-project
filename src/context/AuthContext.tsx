import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AppNotification, DriverApplication } from '../types';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole;
  allUsers: User[];
  notifications: AppNotification[];
  driverApplications: DriverApplication[];
  unreadCount: number;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register_customer' | 'apply_driver';
  openAuthModal: (mode?: 'login' | 'register_customer' | 'apply_driver') => void;
  closeAuthModal: () => void;
  login: (identifier: string, password?: string) => Promise<{ success: boolean; error?: string; role?: UserRole; user?: User }>;
  registerCustomer: (data: any) => Promise<{ success: boolean; error?: string; user?: User }>;
  applyDriver: (data: any) => Promise<{ success: boolean; error?: string; application?: DriverApplication; message?: string }>;
  reviewDriverApplication: (
    id: string,
    action: 'approve' | 'reject',
    assignedTruckId?: string,
    rejectionReason?: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  createAdmin: (adminData: any) => Promise<{ success: boolean; error?: string; user?: User }>;
  switchRole: (role: UserRole) => void;
  switchUser: (userId: string) => void;
  logout: () => void;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshDriverApplications: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  toast: { message: string; type: 'success' | 'info' | 'error' | 'warning' } | null;
  resetDatabase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('customer');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [driverApplications, setDriverApplications] = useState<DriverApplication[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register_customer' | 'apply_driver'>('login');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const openAuthModal = (mode: 'login' | 'register_customer' | 'apply_driver' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
    try {
      const url = new URL(window.location.href);
      const next = mode === 'login' ? 'signin' : mode === 'register_customer' ? 'signup' : 'apply';
      url.searchParams.set('auth', next);
      window.history.pushState({ auth: next }, '', url.toString());
    } catch {
      // ignore (e.g. SSR / non-browser env)
    }
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('auth')) {
        url.searchParams.delete('auth');
        window.history.pushState({}, '', url.toString());
      }
    } catch {
      // ignore
    }
  };

  // Sync modal state with the URL (?auth=signin|signup|apply) and the back/forward buttons
  useEffect(() => {
    const sync = () => {
      try {
        const url = new URL(window.location.href);
        const auth = url.searchParams.get('auth');
        if (auth === 'signin' || auth === 'signup' || auth === 'apply') {
          setAuthModalMode(auth === 'signin' ? 'login' : auth === 'signup' ? 'register_customer' : 'apply_driver');
          setAuthModalOpen(true);
        } else {
          setAuthModalOpen(false);
        }
      } catch {
        // ignore
      }
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const fetchUserData = async (role: UserRole = currentRole) => {
    try {
      const res = await fetch(`/api/auth/me?role=${role}${currentUser?.id ? `&userId=${currentUser.id}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setAllUsers(data.allUsers || []);
      }
    } catch (err) {
      console.error('Failed to load user', err);
    }
  };

  const refreshNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}&role=${currentRole}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  const refreshDriverApplications = async () => {
    try {
      const res = await fetch('/api/driver-applications');
      if (res.ok) {
        const data = await res.json();
        setDriverApplications(data.applications || []);
      }
    } catch (err) {
      console.error('Failed to load driver applications', err);
    }
  };

  useEffect(() => {
    fetchUserData(currentRole);
    refreshDriverApplications();
  }, [currentRole]);

  useEffect(() => {
    if (currentUser) {
      refreshNotifications();
      const interval = setInterval(() => {
        refreshNotifications();
        refreshDriverApplications();
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [currentUser, currentRole]);

  // Login: Authenticates user credentials, determines role & switches dashboard
  const login = async (identifier: string, password?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Authentication failed' };
      }

      setCurrentUser(data.user);
      setCurrentRole(data.role || data.user.role);
      closeAuthModal();
      showToast(`Welcome back, ${data.user.name}! Switched to ${data.user.role.toUpperCase()} Dashboard`, 'success');
      return { success: true, role: data.role || data.user.role, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  // Register Customer: Instantly provisions customer account & logs in
  const registerCustomer = async (formData: any) => {
    try {
      const res = await fetch('/api/auth/register-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      setCurrentUser(data.user);
      setCurrentRole('customer');
      setAllUsers((prev) => [data.user, ...prev]);
      closeAuthModal();
      showToast(`Customer account created for ${data.user.name}! Welcome to CLEANCollect.`, 'success');
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  };

  // Apply to become Driver: Submits application for Admin vetting & approval
  const applyDriver = async (formData: any) => {
    try {
      const res = await fetch('/api/auth/apply-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Application submission failed' };
      }

      refreshDriverApplications();
      refreshNotifications();
      showToast('Driver application submitted! Awaiting Administrator vetting & approval.', 'info');
      return { success: true, application: data.application, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error submitting application' };
    }
  };

  // Admin Review of Driver Application: Approve & Activate or Reject
  const reviewDriverApplication = async (
    id: string,
    action: 'approve' | 'reject',
    assignedTruckId?: string,
    rejectionReason?: string
  ) => {
    try {
      const res = await fetch(`/api/driver-applications/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          assignedTruckId,
          rejectionReason,
          reviewerName: currentUser?.name || 'Administrator',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Review failed' };
      }

      refreshDriverApplications();
      fetchUserData(currentRole);
      refreshNotifications();

      if (action === 'approve') {
        showToast(
          `Driver application APPROVED! ${data.driverUser?.name} is activated & assigned to ${data.application.assignedTruckPlate}.`,
          'success'
        );
      } else {
        showToast(`Driver application ${id} rejected.`, 'info');
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during driver review' };
    }
  };

  // Admin-Only creation of new administrators
  const createAdmin = async (adminData: any) => {
    try {
      const res = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...adminData, creatorRole: currentRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to create administrator' };
      }

      setAllUsers((prev) => [data.user, ...prev]);
      showToast(`Administrator account created for ${data.user.name}`, 'success');
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error creating administrator' };
    }
  };

  const switchRole = (role: UserRole) => {
    setCurrentRole(role);
    const targetUser = allUsers.find((u) => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
    } else {
      fetchUserData(role);
    }
    showToast(`Switched view to ${role.toUpperCase()} Dashboard`, 'info');
  };

  const switchUser = (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setCurrentRole(user.role);
      showToast(`Active profile: ${user.name} (${user.role.toUpperCase()})`, 'success');
    }
  };

  const logout = () => {
    showToast('Logged out. Switched to default guest view.', 'info');
    openAuthModal('login');
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await fetch(`/api/notifications/mark-all-read`, { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast('All notifications marked as read', 'info');
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const resetDatabase = async () => {
    try {
      const res = await fetch('/api/seed/reset', { method: 'POST' });
      if (res.ok) {
        showToast('Database reset to fresh demo state!', 'success');
        fetchUserData(currentRole);
        refreshNotifications();
        refreshDriverApplications();
      }
    } catch (err) {
      showToast('Failed to reset database', 'error');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        allUsers,
        notifications,
        driverApplications,
        unreadCount,
        authModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        registerCustomer,
        applyDriver,
        reviewDriverApplication,
        createAdmin,
        switchRole,
        switchUser,
        logout,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshNotifications,
        refreshDriverApplications,
        showToast,
        toast,
        resetDatabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
