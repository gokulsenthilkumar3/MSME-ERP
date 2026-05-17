import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, FileText, Plus, Package, Users } from 'lucide-react';
import { dashboardApi } from '../lib/api';
import { useAuthStore } from '../store';

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { tenant } = useAuthStore();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: trendData } = useQuery({
    queryKey: ['sales-trend'],
    queryFn: () => dashboardApi.salesTrend().then((r) => r.data.data),
  });

  const { data: recentInvoices } = useQuery({
    queryKey: ['invoices-recent'],
    queryFn: () =>
      import('../lib/api').then(({ invoicesApi }) =>
        invoicesApi.list({ limit: 5 }).then((r) => r.data.data)
      ),
  });

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
          வணக்கம்! 🙏
        </h1>
        <p className="text-muted text-sm">{tenant?.name ?? 'உங்கள் கடை'}</p>
      </div>

      {/* Stat Cards */}
      <div className="card-grid" style={{ marginBottom: '1rem' }}>
        <div className="stat-card primary">
          <div className="stat-label">{t('todaySales')}</div>
          <div className="stat-value">
            {summaryLoading ? '...' : formatCurrency(summary?.today_sales ?? 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
            {summary?.today_invoice_count ?? 0} பில்கள்
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('totalDues')}</div>
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
            {summaryLoading ? '...' : formatCurrency(summary?.total_dues ?? 0)}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {(summary?.low_stock_count ?? 0) > 0 && (
        <div className="alert-banner warning" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={18} />
          <span>
            ⚠️ {summary?.low_stock_count} பொருட்கள் குறைவு சரக்கில் உள்ளன
          </span>
          <Link to="/products?filter=low-stock" className="text-sm font-semibold" style={{ marginLeft: 'auto', color: 'var(--color-warning)' }}>
            பார்க்க →
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="section-header">
        <span className="section-title">{t('quickActions')}</span>
      </div>
      <div className="quick-actions" style={{ marginBottom: '1.5rem' }}>
        <Link to="/invoices/new" className="quick-action">
          <div className="quick-action-icon">
            <FileText size={20} />
          </div>
          <span className="quick-action-label">{t('newInvoice')}</span>
        </Link>
        <Link to="/products/new" className="quick-action">
          <div className="quick-action-icon">
            <Package size={20} />
          </div>
          <span className="quick-action-label">{t('newProduct')}</span>
        </Link>
        <Link to="/customers/new" className="quick-action">
          <div className="quick-action-icon">
            <Users size={20} />
          </div>
          <span className="quick-action-label">{t('newCustomer')}</span>
        </Link>
      </div>

      {/* Sales Trend Chart */}
      {trendData && trendData.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="section-header" style={{ marginBottom: '1rem' }}>
            <span className="section-title">கடந்த 30 நாள் விற்பனை</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A6B3C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1A6B3C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'விற்பனை']}
                labelStyle={{ fontSize: 11 }}
                contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#1A6B3C"
                strokeWidth={2}
                fill="url(#salesGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Invoices */}
      <div className="section-header">
        <span className="section-title">{t('recentInvoices')}</span>
        <Link to="/invoices" className="text-sm text-primary font-medium">
          அனைத்தும் →
        </Link>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {!recentInvoices || recentInvoices.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-state-icon">
              <FileText size={24} />
            </div>
            <p className="empty-state-desc">இன்னும் பில் இல்லை</p>
            <Link to="/invoices/new" className="btn btn-primary btn-sm">
              <Plus size={16} /> முதல் பில் உருவாக்கு
            </Link>
          </div>
        ) : (
          recentInvoices.map((inv: {
            id: string;
            invoice_no: string;
            customers?: { name: string };
            total: number;
            status: string;
          }) => (
            <Link key={inv.id} to={`/invoices/${inv.id}`} className="list-item">
              <div className="list-item-icon">
                <FileText size={18} />
              </div>
              <div className="list-item-content">
                <div className="list-item-title">{inv.customers?.name ?? 'வாடிக்கையாளர்'}</div>
                <div className="list-item-subtitle">{inv.invoice_no}</div>
              </div>
              <div className="list-item-right">
                <div className="font-semibold">{formatCurrency(inv.total)}</div>
                <span
                  className={`badge badge-${
                    inv.status === 'paid'
                      ? 'success'
                      : inv.status === 'overdue'
                      ? 'danger'
                      : 'warning'
                  }`}
                >
                  {inv.status === 'paid' ? '✅ Paid' : inv.status === 'overdue' ? '⏰ Overdue' : '📄 Sent'}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
