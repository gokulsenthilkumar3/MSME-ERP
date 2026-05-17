import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Home, FileText, Package, Users, Settings, Wifi, WifiOff, RefreshCw
} from 'lucide-react';
import { useAuthStore, useAppStore } from '../store';

export default function AppLayout() {
  const { t } = useTranslation();
  const { tenant } = useAuthStore();
  const { isOnline, isSyncing, setOnline } = useAppStore();

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setOnline]);

  const navItems = [
    { to: '/', icon: Home, label: t('home') },
    { to: '/invoices', icon: FileText, label: t('invoices') },
    { to: '/products', icon: Package, label: t('products') },
    { to: '/customers', icon: Users, label: t('customers') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <span className="header-shop-name">{tenant?.name ?? 'MSME ERP'}</span>
        <span className="header-title"></span>
        <div className="sync-status">
          {isSyncing ? (
            <>
              <div className="sync-dot syncing" />
              <RefreshCw size={12} className="text-muted" />
            </>
          ) : isOnline ? (
            <>
              <div className="sync-dot online" />
              <Wifi size={13} />
            </>
          ) : (
            <>
              <div className="sync-dot offline" />
              <WifiOff size={13} />
            </>
          )}
          <span className="text-xs text-muted">
            {isSyncing ? t('syncing') : isOnline ? t('online') : t('offline')}
          </span>
        </div>
      </header>

      {/* Page Content */}
      <main className="page-content">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
