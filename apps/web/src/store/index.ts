import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  phone: string;
  tenant_id: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  gstin?: string;
  language: 'ta' | 'en' | 'ml' | 'bfq' | 'iru' | 'tcx' | 'kfe' | 'kur';
  invoice_prefix: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User, tenant: Tenant) => void;
  setTenant: (tenant: Tenant) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenant: null,
      isAuthenticated: false,
      setAuth: (token, user, tenant) =>
        set({ token, user, tenant, isAuthenticated: true }),
      setTenant: (tenant) => set({ tenant }),
      logout: () =>
        set({ token: null, user: null, tenant: null, isAuthenticated: false }),
    }),
    {
      name: 'msme-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Online/offline & sync state
interface AppState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  setOnline: (v: boolean) => void;
  setSyncing: (v: boolean) => void;
  setPendingCount: (n: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  setOnline: (v) => set({ isOnline: v }),
  setSyncing: (v) => set({ isSyncing: v }),
  setPendingCount: (n) => set({ pendingCount: n }),
}));
