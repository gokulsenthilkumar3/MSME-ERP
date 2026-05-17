import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Search, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { customersApi } from '../lib/api';

interface Customer {
  id: string;
  name: string;
  phone: string;
  gstin?: string;
  address?: string;
  balance: number;
}

function formatCurrency(n: number) {
  return `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export default function CustomersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', gstin: '', address: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list({ search, limit: 50 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: object) => customersApi.create(d),
    onSuccess: () => {
      toast.success('வாடிக்கையாளர் சேர்க்கப்பட்டார் ✅');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      resetForm();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'பிழை ஏற்பட்டது'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      customersApi.update(id, data),
    onSuccess: () => {
      toast.success('திருத்தம் சேமிக்கப்பட்டது ✅');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      resetForm();
    },
  });

  const resetForm = () => {
    setForm({ name: '', phone: '', gstin: '', address: '' });
    setShowForm(false);
    setEditCustomer(null);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({ name: c.name, phone: c.phone ?? '', gstin: c.gstin ?? '', address: c.address ?? '' });
    setShowForm(true);
  };

  const handleSubmit = () => {
    const payload = { ...form, phone: form.phone ? `+91${form.phone.replace(/\D/g, '').slice(-10)}` : undefined };
    if (editCustomer) {
      updateMutation.mutate({ id: editCustomer.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const customers: Customer[] = data?.data ?? [];

  if (showForm) {
    return (
      <div>
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <h1>{editCustomer ? 'வாடிக்கையாளர் திருத்து' : t('addCustomer')}</h1>
          <button className="btn btn-secondary btn-sm" onClick={resetForm}>{t('cancel')}</button>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-name">👤 {t('customerName')}</label>
          <input id="cf-name" className="form-input" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. குமார்" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-phone">📱 {t('phone')}</label>
          <input id="cf-phone" className="form-input" type="tel" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-gstin">GSTIN (விருப்பமானது)</label>
          <input id="cf-gstin" className="form-input" value={form.gstin}
            onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder="22AAAAA0000A1Z5" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-address">📍 {t('address')}</label>
          <textarea id="cf-address" className="form-input" value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="முகவரி..." />
        </div>
        <button id="save-customer-btn" className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={createMutation.isPending || updateMutation.isPending}>
          {t('save')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header" style={{ marginBottom: '1rem' }}>
        <h1>{t('customers')}</h1>
        <span className="badge badge-primary">{customers.length}</span>
      </div>

      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input id="customers-search" className="form-input" style={{ paddingLeft: '2.5rem' }}
          placeholder={`${t('search')} வாடிக்கையாளரை...`}
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Users size={28} /></div>
          <p className="empty-state-title">வாடிக்கையாளர்கள் இல்லை</p>
          <p className="empty-state-desc">புதிய வாடிக்கையாளரை சேர்க்கவும்</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {customers.map((c) => (
            <div key={c.id} className="list-item" style={{ cursor: 'pointer' }}
              onClick={() => openEdit(c)}>
              <div className="list-item-icon">
                <Users size={18} />
              </div>
              <div className="list-item-content">
                <div className="list-item-title">{c.name}</div>
                <div className="list-item-subtitle">{c.phone}</div>
              </div>
              <div className="list-item-right" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {c.balance > 0 ? (
                  <span className="badge badge-danger">🔴 {formatCurrency(c.balance)}</span>
                ) : c.balance < 0 ? (
                  <span className="badge badge-success">🟢 {formatCurrency(c.balance)}</span>
                ) : (
                  <span className="badge badge-primary">✅ Clear</span>
                )}
                <ChevronRight size={16} className="text-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="fab" id="add-customer-fab" onClick={() => setShowForm(true)} title={t('addCustomer')}>
        <Plus size={26} />
      </button>
    </div>
  );
}
