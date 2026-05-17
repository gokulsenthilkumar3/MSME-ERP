import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, Search, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesApi, customersApi, productsApi } from '../lib/api';

interface Invoice {
  id: string;
  invoice_no: string;
  invoice_date: string;
  total: number;
  status: string;
  customers?: { name: string };
}

type Status = 'draft' | 'sent' | 'paid' | 'overdue';

function formatCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

const statusLabel: Record<Status, string> = {
  draft: '📝 Draft',
  sent: '📄 Sent',
  paid: '✅ Paid',
  overdue: '⏰ Overdue',
};


export default function InvoicesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Create invoice form state
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ product_id: string; qty: number; unit_price: number; gst_rate: number }[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search],
    queryFn: () => invoicesApi.list({ limit: 50 }).then((r) => r.data),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersApi.list({ limit: 200 }).then((r) => r.data.data),
    enabled: showCreate,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.list({ limit: 200 }).then((r) => r.data.data),
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: (d: object) => invoicesApi.create(d),
    onSuccess: () => {
      toast.success(t('invoiceCreated'));
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setShowCreate(false);
      resetCreate();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? t('error')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      invoicesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('நிலை மாற்றப்பட்டது');
    },
  });

  const resetCreate = () => {
    setCustomerId(''); setInvoiceDate(new Date().toISOString().split('T')[0]);
    setNotes(''); setItems([]);
  };

  const addItem = () => {
    setItems([...items, { product_id: '', qty: 1, unit_price: 0, gst_rate: 5 }]);
  };

  const updateItem = (idx: number, field: string, value: string | number) => {
    const updated = items.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'product_id') {
        const prod = (productsData as { id: string; price: number; gst_rate: number }[])?.find((p) => p.id === value);
        return { ...item, product_id: String(value), unit_price: prod?.price ?? 0, gst_rate: prod?.gst_rate ?? 5 };
      }
      return { ...item, [field]: Number(value) || value };
    });
    setItems(updated);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const totalGst = items.reduce((s, it) => s + (it.qty * it.unit_price * it.gst_rate) / 100, 0);
  const grandTotal = subtotal + totalGst;

  const invoices: Invoice[] = data?.data ?? [];

  if (showCreate) {
    return (
      <div>
        <div className="section-header section-header-lg">
          <h1>{t('createInvoice')}</h1>
          <button className="btn btn-secondary btn-sm" onClick={() => { setShowCreate(false); resetCreate(); }}>{t('cancel')}</button>
        </div>

        {/* Customer */}
        <div className="form-group">
          <label className="form-label" htmlFor="inv-customer">👤 {t('selectCustomer')}</label>
          <select id="inv-customer" className="form-input form-select" value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">-- வாடிக்கையாளரை தேர்ந்தெடுக்கவும் --</option>
            {(customersData as { id: string; name: string; phone: string }[] | undefined)?.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="inv-date">📅 பில் தேதி</label>
          <input id="inv-date" className="form-input" type="date" value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>

        {/* Items */}
        <div className="section-header invoice-items-header">
          <span className="section-title">பொருட்கள்</span>
          <button className="btn btn-secondary btn-sm" id="add-item-btn" onClick={addItem}>
            <Plus size={16} /> {t('addItem')}
          </button>
        </div>

        {items.map((item, idx) => (
          <div key={idx} className="invoice-item-row invoice-item-col">
            <div className="invoice-item-row-inner">
              <select
                className="form-input form-select flex-2"
                value={item.product_id}
                aria-label="Select product"
                title="Select product"
                onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
              >
                <option value="">-- பொருள் --</option>
                {(productsData as { id: string; name: string; sku: string }[] | undefined)?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
              <button
                className="btn btn-danger btn-sm btn-remove"
                onClick={() => removeItem(idx)}
              >✕</button>
            </div>
            <div className="grid-3col">
              <div>
                <label className="form-label form-label-xs">அளவு</label>
                <input className="form-input" type="number" min="0.001" step="0.001"
                  aria-label="Quantity" placeholder="1"
                  value={item.qty} onChange={(e) => updateItem(idx, 'qty', e.target.value)} />
              </div>
              <div>
                <label className="form-label form-label-xs">விலை (₹)</label>
                <input className="form-input" type="number" min="0" step="0.01"
                  aria-label="Unit price" placeholder="0.00"
                  value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} />
              </div>
              <div>
                <label className="form-label form-label-xs">GST %</label>
                <select className="form-input form-select" value={item.gst_rate}
                  aria-label="GST rate" title="GST rate"
                  onChange={(e) => updateItem(idx, 'gst_rate', e.target.value)}>
                  {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
            </div>
            <div className="text-sm text-muted text-right">
              வரி உட்பட: {formatCurrency(item.qty * item.unit_price * (1 + item.gst_rate / 100))}
            </div>
          </div>
        ))}

        {/* Totals */}
        {items.length > 0 && (
          <div className="invoice-total-box">
            <div className="invoice-total-row">
              <span className="text-muted">{t('subtotal')}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="invoice-total-row">
              <span className="text-muted">{t('gst')}</span>
              <span>{formatCurrency(totalGst)}</span>
            </div>
            <div className="invoice-total-row grand">
              <span>{t('grandTotal')}</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        )}

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label" htmlFor="inv-notes">📝 குறிப்புகள் (விருப்பமானது)</label>
          <textarea id="inv-notes" className="form-input" value={notes}
            onChange={(e) => setNotes(e.target.value)} placeholder="மாதாந்திர விநியோகம்..." />
        </div>

        <button
          id="generate-invoice-btn"
          className="btn btn-primary btn-full mt-half"
          disabled={!customerId || items.length === 0 || createMutation.isPending}
          onClick={() =>
            createMutation.mutate({
              customer_id: customerId,
              invoice_date: invoiceDate,
              notes,
              items,
            })
          }
        >
          {createMutation.isPending ? '...' : t('generateInvoice')} 🧾
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header section-header-mb">
        <h1>{t('invoices')}</h1>
        <span className="badge badge-primary">{invoices.length}</span>
      </div>

      <div className="search-wrapper">
        <Search size={16} className="search-icon-abs" />
        <input id="invoices-search" className="form-input search-padded"
          placeholder={`${t('search')} பில்களை...`}
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FileText size={28} /></div>
          <p className="empty-state-title">பில்கள் இல்லை</p>
          <p className="empty-state-desc">புதிய பில் உருவாக்கவும்</p>
        </div>
      ) : (
        <div className="card card-list">
          {invoices.map((inv) => (
            <div key={inv.id} className="list-item">
              <div className="list-item-icon">
                <FileText size={18} />
              </div>
              <div className="list-item-content">
                <div className="list-item-title">{inv.customers?.name ?? 'வாடிக்கையாளர்'}</div>
                <div className="list-item-subtitle">{inv.invoice_no} · {inv.invoice_date}</div>
              </div>
              <div className="list-item-right list-right-col">
                <div className="font-semibold">{formatCurrency(inv.total)}</div>
                <select
                  className="badge status-badge-select"
                  value={inv.status}
                  aria-label="Invoice status"
                  title="Invoice status"
                  onChange={(e) => statusMutation.mutate({ id: inv.id, status: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(['draft', 'sent', 'paid', 'overdue'] as Status[]).map((s) => (
                    <option key={s} value={s}>{statusLabel[s]}</option>
                  ))}
                </select>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </div>
          ))}
        </div>
      )}

      <button className="fab" id="create-invoice-fab" onClick={() => setShowCreate(true)} title={t('createInvoice')}>
        <Plus size={26} />
      </button>
    </div>
  );
}
