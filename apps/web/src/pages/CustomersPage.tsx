import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Search, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { customersApi } from '../lib/api';

interface Customer {
  id: string;
  name: string;
  phone: string;
  gstin?: string;
  address?: string;
  balance: number;
}

const customerSchema = z.object({
  name: z.string().min(2, 'பெயர் குறைந்தது 2 எழுத்துகள் இருக்க வேண்டும்'),
  phone: z.string().regex(/^\d{10}$/, '10 இலக்க அலைபேசி எண் தேவை').or(z.literal('')),
  gstin: z.string().regex(/^(\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})?$/, 'சரியான GSTIN தேவை').optional().or(z.literal('')),
  address: z.string().optional(),
});
type CustomerFormValues = z.infer<typeof customerSchema>;

function formatCurrency(n: number) {
  return `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export default function CustomersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(customerSchema as any),
    defaultValues: { name: '', phone: '', gstin: '', address: '' }
  });

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
    reset({ name: '', phone: '', gstin: '', address: '' });
    setShowForm(false);
    setEditCustomer(null);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    reset({
      name: c.name,
      phone: c.phone ? c.phone.replace('+91', '') : '',
      gstin: c.gstin ?? '',
      address: c.address ?? ''
    });
    setShowForm(true);
  };

  const onSubmit = (data: CustomerFormValues) => {
    const payload = {
      ...data,
      phone: data.phone ? `+91${data.phone}` : undefined,
    };
    if (editCustomer) {
      updateMutation.mutate({ id: editCustomer.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const customers: Customer[] = data?.data ?? [];

  if (showForm) {
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="section-header section-header-lg">
          <h1>{editCustomer ? 'வாடிக்கையாளர் திருத்து' : t('addCustomer')}</h1>
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>{t('cancel')}</button>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-name">👤 {t('customerName')}</label>
          <input id="cf-name" className="form-input" {...register('name')} placeholder="e.g. குமார்" />
          {errors.name && <span className="form-error-msg">{errors.name.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-phone">📱 {t('phone')}</label>
          <input id="cf-phone" className="form-input" type="tel" {...register('phone')} placeholder="9876543210" />
          {errors.phone && <span className="form-error-msg">{errors.phone.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-gstin">GSTIN (விருப்பமானது)</label>
          <input id="cf-gstin" className="form-input" {...register('gstin')} placeholder="22AAAAA0000A1Z5" />
          {errors.gstin && <span className="form-error-msg">{errors.gstin.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-address">📍 {t('address')}</label>
          <textarea id="cf-address" className="form-input" {...register('address')} placeholder="முகவரி..." />
          {errors.address && <span className="form-error-msg">{errors.address.message}</span>}
        </div>
        <button type="submit" id="save-customer-btn" className="btn btn-primary btn-full"
          disabled={createMutation.isPending || updateMutation.isPending}>
          {t('save')}
        </button>
      </form>
    );
  }

  return (
    <div>
      <div className="section-header section-header-mb">
        <h1>{t('customers')}</h1>
        <span className="badge badge-primary">{customers.length}</span>
      </div>

      <div className="search-wrapper">
        <Search size={16} className="search-icon-abs" />
        <input id="customers-search" className="form-input search-padded"
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
        <div className="card card-list">
          {customers.map((c) => (
            <div key={c.id} className="list-item cursor-pointer"
              onClick={() => openEdit(c)}>
              <div className="list-item-icon">
                <Users size={18} />
              </div>
              <div className="list-item-content">
                <div className="list-item-title">{c.name}</div>
                <div className="list-item-subtitle">{c.phone}</div>
              </div>
              <div className="list-item-right list-right-flex">
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
