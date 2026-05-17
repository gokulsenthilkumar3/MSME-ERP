import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Package, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi } from '../lib/api';

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  gst_rate: number;
  stock_qty: number;
  low_stock_threshold: number;
  hsn_code?: string;
  is_active: boolean;
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', sku: '', unit: 'pcs', price: '', gst_rate: '5',
    hsn_code: '', stock_qty: '0', low_stock_threshold: '10',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productsApi.list({ search, limit: 50 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: object) => productsApi.create(d),
    onSuccess: () => {
      toast.success('பொருள் சேர்க்கப்பட்டது ✅');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      resetForm();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'பிழை ஏற்பட்டது'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      toast.success('திருத்தம் சேமிக்கப்பட்டது ✅');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      resetForm();
    },
    onError: () => toast.error('திருத்த முடியவில்லை'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      toast.success('பொருள் நீக்கப்பட்டது');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      resetForm();
    },
  });

  const resetForm = () => {
    setForm({ name: '', sku: '', unit: 'pcs', price: '', gst_rate: '5', hsn_code: '', stock_qty: '0', low_stock_threshold: '10' });
    setShowForm(false);
    setEditProduct(null);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, sku: p.sku, unit: p.unit,
      price: String(p.price), gst_rate: String(p.gst_rate),
      hsn_code: p.hsn_code ?? '', stock_qty: String(p.stock_qty),
      low_stock_threshold: String(p.low_stock_threshold),
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    const payload = {
      ...form,
      price: parseFloat(form.price),
      gst_rate: parseFloat(form.gst_rate),
      stock_qty: parseFloat(form.stock_qty),
      low_stock_threshold: parseFloat(form.low_stock_threshold),
    };
    if (editProduct) {
      updateMutation.mutate({ id: editProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const products: Product[] = data?.data ?? [];
  const isLowStock = (p: Product) => p.stock_qty < p.low_stock_threshold;

  if (showForm) {
    return (
      <div>
        <div className="section-header section-header-lg">
          <h1>{editProduct ? 'பொருள் திருத்து' : t('addProduct')}</h1>
          <button className="btn btn-secondary btn-sm" onClick={resetForm}>{t('cancel')}</button>
        </div>

        {(['name', 'sku'] as const).map((field) => (
          <div className="form-group" key={field}>
            <label className="form-label" htmlFor={`pf-${field}`}>
              {field === 'name' ? t('productName') : 'SKU'}
            </label>
            <input
              id={`pf-${field}`}
              className="form-input"
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              placeholder={field === 'name' ? 'e.g. அரிசி' : 'e.g. RICE-001'}
            />
          </div>
        ))}

        <div className="card-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="pf-unit">{t('unit')}</label>
            <select id="pf-unit" className="form-input form-select" value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {['pcs', 'kg', 'litre', 'box', 'pack', 'set'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pf-gst">{t('gstRate')} %</label>
            <select id="pf-gst" className="form-input form-select" value={form.gst_rate}
              onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}>
              {[0, 5, 12, 18, 28].map(r => (
                <option key={r} value={r}>{r}%</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="pf-price">{t('price')} (₹)</label>
            <input id="pf-price" className="form-input" type="number" min="0" step="0.01"
              value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pf-hsn">{t('hsnCode')}</label>
            <input id="pf-hsn" className="form-input" value={form.hsn_code}
              onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} placeholder="e.g. 1006" />
          </div>
        </div>

        <div className="card-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="pf-stock">{t('stockQty')}</label>
            <input id="pf-stock" className="form-input" type="number" min="0"
              value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pf-threshold">{t('lowStockThreshold')}</label>
            <input id="pf-threshold" className="form-input" type="number" min="0"
              value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
          </div>
        </div>

        <button
          id="save-product-btn"
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {t('save')}
        </button>
        {editProduct && (
          <button
            id="delete-product-btn"
            className="btn btn-danger btn-full mt-3"
            onClick={() => deleteMutation.mutate(editProduct.id)}
            disabled={deleteMutation.isPending}
          >
            {t('delete')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
        <div className="section-header section-header-mb">
        <h1>{t('products')}</h1>
        <span className="badge badge-primary">{products.length}</span>
      </div>

      {/* Search */}
      <div className="search-wrapper">
        <Search size={16} className="search-icon-abs" />
        <input
          id="products-search"
          className="form-input search-padded"
          placeholder={`${t('search')} பொருளை...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Package size={28} /></div>
          <p className="empty-state-title">பொருட்கள் இல்லை</p>
          <p className="empty-state-desc">புதிய பொருளை சேர்க்கவும்</p>
        </div>
      ) : (
        <div className="card card-list">
          {products.map((p) => (
            <div
              key={p.id}
              className="list-item"
              onClick={() => openEdit(p)}
            >
              <div className={`list-item-icon${isLowStock(p) ? ' low-stock-icon' : ''}`}>
                {isLowStock(p) ? <AlertTriangle size={18} /> : <Package size={18} />}
              </div>
              <div className="list-item-content">
                <div className="list-item-title">{p.name}</div>
                <div className="list-item-subtitle">{p.sku} · {p.unit} · {p.gst_rate}% GST</div>
              </div>
              <div className="list-item-right">
                <div className="font-semibold">{formatCurrency(p.price)}</div>
                <div className={`text-sm ${isLowStock(p) ? 'text-danger' : 'text-muted'}`}>
                  {p.stock_qty} {p.unit}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button className="fab" id="add-product-fab" onClick={() => setShowForm(true)} title={t('addProduct')}>
        <Plus size={26} />
      </button>
    </div>
  );
}
