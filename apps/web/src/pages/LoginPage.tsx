import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store';

type Step = 'phone' | 'otp' | 'onboard';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    return digits.startsWith('91') ? `+${digits}` : `+91${digits}`;
  };

  const handleSendOtp = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      toast.error('சரியான தொலைபேசி எண் உள்ளிடுக');
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp(formatPhone(phone));
      toast.success(t('otpSent'));
      setStep('otp');
    } catch {
      toast.error('OTP அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('6 இலக்க OTP உள்ளிடுக');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp(formatPhone(phone), otp);
      setTempToken(data.token);
      if (data.is_new) {
        setIsNew(true);
        setStep('onboard');
      } else {
        // Fetch user/tenant
        const meRes = await authApi.getMe();
        setAuth(data.token, meRes.data.user, meRes.data.tenant);
        navigate('/');
      }
    } catch {
      toast.error('தவறான OTP. மீண்டும் முயற்சிக்கவும்.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboard = async () => {
    if (!businessName.trim()) {
      toast.error('கடையின் பெயர் உள்ளிடுக');
      return;
    }
    setLoading(true);
    try {
      // Temporarily set token for the onboard call
      const origToken = useAuthStore.getState().token;
      useAuthStore.setState({ token: tempToken });

      await authApi.onboard({ name: businessName, language: 'ta' });
      const meRes = await authApi.getMe();
      setAuth(tempToken, meRes.data.user, meRes.data.tenant);

      // Restore if something happened
      if (!useAuthStore.getState().isAuthenticated) {
        useAuthStore.setState({ token: origToken });
      }

      toast.success('வரவேற்கிறோம்! 🎉');
      navigate('/');
    } catch {
      toast.error('பதிவு செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <ShoppingBag size={36} />
      </div>

      <div className="auth-card">
        {step === 'phone' && (
          <>
            <h1 style={{ marginBottom: '0.5rem' }}>வணக்கம்! 🙏</h1>
            <p className="text-muted text-sm" style={{ marginBottom: '2rem' }}>
              உங்கள் கடையை நிர்வகிக்க உள்நுழைக
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="phone-input">
                📱 {t('enterPhone')}
              </label>
              <input
                id="phone-input"
                className="form-input"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={handleSendOtp}
              disabled={loading}
              id="send-otp-btn"
            >
              {loading ? '...' : t('sendOtp')}
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginBottom: '1rem' }}
              onClick={() => setStep('phone')}
            >
              ← திரும்பு
            </button>
            <h2 style={{ marginBottom: '0.5rem' }}>OTP சரிபார்</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>
              {formatPhone(phone)} க்கு அனுப்பப்பட்டது
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="otp-input">
                🔐 {t('enterOtp')}
              </label>
              <input
                id="otp-input"
                className="form-input"
                type="number"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.5rem' }}
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={handleVerifyOtp}
              disabled={loading}
              id="verify-otp-btn"
            >
              {loading ? '...' : t('verifyOtp')}
            </button>
          </>
        )}

        {step === 'onboard' && isNew && (
          <>
            <h2 style={{ marginBottom: '0.5rem' }}>கடை விவரங்கள்</h2>
            <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>
              உங்கள் கடையை அமைக்கவும்
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="biz-name">
                🏪 கடையின் பெயர்
              </label>
              <input
                id="biz-name"
                className="form-input"
                type="text"
                placeholder="e.g. கார்த்திக் கிரானாஸ்"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={handleOnboard}
              disabled={loading}
              id="onboard-btn"
            >
              {loading ? '...' : 'தொடங்கு 🚀'}
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-muted" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        MSME ERP v0.1 — Tamil-first billing for Indian shops
      </p>
    </div>
  );
}
