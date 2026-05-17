import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Globe, LogOut, User, ChevronRight, Store, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store';

type LangCode = 'ta' | 'en' | 'ml' | 'bfq' | 'iru' | 'tcx' | 'kfe' | 'kur';

const LANGUAGES: { code: LangCode; native: string; label: string; script: string }[] = [
  { code: 'ta',  native: 'தமிழ்',       label: 'Tamil',          script: 'Dravidian' },
  { code: 'en',  native: 'English',     label: 'English',        script: 'Latin'     },
  { code: 'ml',  native: 'മലയാളം',      label: 'Malayalam',      script: 'Dravidian' },
  { code: 'bfq', native: 'ಬಡಗ',         label: 'Badaga',         script: 'Nilgiri'   },
  { code: 'iru', native: 'இருள',        label: 'Irula',          script: 'Nilgiri'   },
  { code: 'tcx', native: 'தொட',         label: 'Toda',           script: 'Nilgiri'   },
  { code: 'kfe', native: 'கோத',         label: 'Kota',           script: 'Nilgiri'   },
  { code: 'kur', native: 'குறும்ப',     label: 'Kurumba',        script: 'Nilgiri'   },
];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { tenant, user, logout } = useAuthStore();
  const [editProfile, setEditProfile] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [form, setForm] = useState({
    name: tenant?.name ?? '',
    gstin: '',
    address: '',
    invoice_prefix: tenant?.invoice_prefix ?? 'INV',
  });

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.getMe().then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (d: object) => authApi.updateTenant(d),
    onSuccess: (res) => {
      toast.success(t('save') + ' ✅');
      useAuthStore.setState((s) => ({ tenant: { ...s.tenant!, ...res.data } }));
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setEditProfile(false);
    },
    onError: () => toast.error(t('error')),
  });

  const changeLang = (code: LangCode) => {
    i18n.changeLanguage(code);
    authApi.updateTenant({ language: code }).catch(() => null);
    const lang = LANGUAGES.find((l) => l.code === code);
    toast.success(`${lang?.native ?? code} selected`);
    setShowLangModal(false);
  };

  const tenantData = meData?.tenant ?? {};
  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  if (editProfile) {
    return (
      <div>
        <div className="section-header section-header-lg">
          <h1>{t('settings')}</h1>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditProfile(false)}>{t('cancel')}</button>
        </div>

        {[
          { id: 'sf-name',   label: '🏪 ' + t('customerName'), field: 'name',           placeholder: 'கார்த்திக் கிரானாஸ்' },
          { id: 'sf-gstin',  label: 'GSTIN',                   field: 'gstin',          placeholder: '22AAAAA0000A1Z5'     },
          { id: 'sf-addr',   label: '📍 ' + t('address'),      field: 'address',        placeholder: t('address') + '...'  },
          { id: 'sf-prefix', label: '📄 Invoice Prefix',       field: 'invoice_prefix', placeholder: 'INV'                 },
        ].map(({ id, label, field, placeholder }) => (
          <div className="form-group" key={field}>
            <label className="form-label" htmlFor={id}>{label}</label>
            <input id={id} className="form-input" value={form[field as keyof typeof form]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              placeholder={placeholder} />
          </div>
        ))}

        <button id="save-profile-btn" className="btn btn-primary btn-full"
          disabled={updateMutation.isPending}
          onClick={() => updateMutation.mutate(form)}>
          {t('save')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="section-header-lg">{t('settings')}</h1>

      {/* Profile Summary */}
      <div className="card profile-card">
        <div className="avatar">
          {(tenant?.name ?? 'S').charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-semibold">{tenantData.name ?? tenant?.name}</div>
          <div className="text-sm text-muted">{user?.phone}</div>
          {tenantData.gstin && <div className="text-xs text-muted">GST: {tenantData.gstin}</div>}
        </div>
      </div>

      {/* Menu Items */}
      <div className="card settings-menu-card">
        <button className="list-item" id="edit-profile-btn" onClick={() => {
          setForm({
            name: tenantData.name ?? '',
            gstin: tenantData.gstin ?? '',
            address: tenantData.address ?? '',
            invoice_prefix: tenantData.invoice_prefix ?? 'INV',
          });
          setEditProfile(true);
        }}>
          <div className="list-item-icon"><Store size={18} /></div>
          <div className="list-item-content">
            <div className="list-item-title">கடை விவரங்கள்</div>
            <div className="list-item-subtitle">{t('customerName')}, GSTIN, {t('address')}</div>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>

        <button className="list-item" id="toggle-lang-btn" onClick={() => setShowLangModal(true)}>
          <div className="list-item-icon"><Globe size={18} /></div>
          <div className="list-item-content">
            <div className="list-item-title">மொழி / Language</div>
            <div className="list-item-subtitle">
              {currentLang.native} · {currentLang.label}
            </div>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>

        <button className="list-item" id="account-btn">
          <div className="list-item-icon"><User size={18} /></div>
          <div className="list-item-content">
            <div className="list-item-title">கணக்கு</div>
            <div className="list-item-subtitle">{user?.role} · {user?.phone}</div>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>
      </div>

      {/* Logout */}
      <button
        id="logout-btn"
        className="btn btn-danger btn-full"
        onClick={() => { logout(); window.location.href = '/login'; }}
      >
        <LogOut size={18} />
        வெளியேறு / Logout
      </button>

      <p className="text-xs text-muted settings-footer">
        MSME ERP v0.1 · Nilgiris-first billing
      </p>

      {/* Language Selection Modal */}
      {showLangModal && (
        <div
          className="lang-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Select Language"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLangModal(false); }}
        >
          <div className="lang-modal">
            <div className="lang-modal-header">
              <span className="lang-modal-title">🌐 மொழி தேர்வு / Select Language</span>
              <button
                className="btn btn-secondary lang-modal-close"
                onClick={() => setShowLangModal(false)}
                aria-label="Close language selector"
              >
                <X size={16} />
              </button>
            </div>
            <div className="lang-grid">
              {LANGUAGES.map((lang) => {
                const isActive = i18n.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    id={`lang-option-${lang.code}`}
                    className={`lang-option${isActive ? ' active' : ''}`}
                    onClick={() => changeLang(lang.code)}
                    aria-label={`Select ${lang.label}`}
                    aria-pressed={isActive}
                  >
                    <div className="lang-option-inner">
                      <span className="lang-option-native">{lang.native}</span>
                      {isActive && <Check size={14} className="lang-check-icon" />}
                    </div>
                    <span className="lang-option-label">{lang.label}</span>
                    <span className="lang-option-label lang-option-sub">{lang.script}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
