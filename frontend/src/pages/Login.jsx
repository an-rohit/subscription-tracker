import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import logo from '../assets/subtrackerlogo.png';

/* ── Icons ── */
const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
    <path d="m2 8 10 7 10-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

const EyeIcon = ({ closed }) => closed ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Floating Shape ── */
const FloatingShape = ({ style, delay = 0 }) => (
  <Motion.div
    animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
    transition={{ duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    style={{
      position: 'absolute',
      borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
      opacity: 0.12,
      ...style,
    }}
  />
);

/* ── Input Field ── */
const InputField = ({ icon, label, id, type, placeholder, value, onChange, autoComplete, required, rightElement }) => (
  <div style={{ display: 'grid', gap: '8px', marginBottom: '18px' }}>
    <label htmlFor={id} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.01em' }}>
      {label}
    </label>
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
        color: 'var(--text-subtle)', pointerEvents: 'none', display: 'flex',
      }}>
        {icon}
      </span>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        style={{ paddingLeft: '40px', paddingRight: rightElement ? '42px' : '14px' }}
      />
      {rightElement && (
        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
          {rightElement}
        </span>
      )}
    </div>
  </div>
);

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get('googleToken');
    const userRaw = params.get('user');
    const googleError = params.get('googleError');

    if (googleError) {
      toast.error(googleError);
      navigate('/login', { replace: true });
      return;
    }

    if (googleToken && userRaw) {
      try {
        login(JSON.parse(userRaw), googleToken);
        toast.success('Google account connected!');
        navigate('/', { replace: true });
      } catch {
        toast.error('Could not complete Google login');
        navigate('/login', { replace: true });
      }
    }
  }, [login, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.user, res.data.token);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const res = await api.post('/auth/google');
      window.location.href = res.data.authUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google login is not configured');
      setGoogleLoading(false);
    }
  };

  const features = [
    'AI-assisted subscription detection',
    'Animated analytics & renewal calendar',
    'Database trigger-backed payment history',
    'Dark mode & renewal reminders',
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' }}>

      {/* ── Brand Panel ── */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px',
        background: 'var(--gradient-hero)',
        color: '#fff',
      }}>
        {/* Floating shapes */}
        <FloatingShape delay={0} style={{ width: 280, height: 280, top: '-60px', right: '-60px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
        <FloatingShape delay={1.5} style={{ width: 180, height: 180, bottom: '120px', left: '-40px', background: 'linear-gradient(135deg, #06b6d4, #0f766e)' }} />
        <FloatingShape delay={3} style={{ width: 120, height: 120, bottom: '40%', right: '10%', background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }} />

        {/* Noise overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '56px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '14px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}>
              <img src={logo} alt="SubTracker logo" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }} />
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '22px', letterSpacing: '-0.02em' }}>
              SubTracker
            </span>
          </div>

          {/* Headline */}
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '999px', padding: '6px 14px', marginBottom: '20px',
              fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
              Subscription Intelligence
            </div>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(36px, 4.5vw, 58px)',
              fontWeight: 800, lineHeight: 1.05,
              letterSpacing: '-0.03em', color: '#fff',
              maxWidth: 560,
            }}>
              Know every renewal before it hits your wallet.
            </h1>
            <p style={{ marginTop: '18px', maxWidth: 500, color: 'rgba(255,255,255,0.72)', fontSize: '16px', lineHeight: 1.7 }}>
              Track recurring payments, surface upcoming renewals, and understand monthly spend — all from one focused dashboard.
            </p>
          </Motion.div>
        </div>

        {/* Feature list */}
        <Motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', zIndex: 2, maxWidth: 520 }}
        >
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '28px', display: 'grid', gap: '14px' }}>
            {features.map((f, i) => (
              <Motion.div
                key={f}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.07, duration: 0.3 }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.82)', fontSize: '14px' }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: '7px', flexShrink: 0,
                  background: 'rgba(52, 211, 153, 0.20)',
                  border: '1px solid rgba(52,211,153,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#34d399',
                }}>
                  <CheckIcon />
                </span>
                {f}
              </Motion.div>
            ))}
          </div>
        </Motion.div>
      </section>

      {/* ── Form Panel ── */}
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 28px',
        background: 'var(--bg)',
      }}>
        <Motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: '100%',
            maxWidth: '440px',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '36px',
            boxShadow: 'var(--shadow-strong)',
          }}
        >
          {/* Card header */}
          <div style={{ marginBottom: '28px' }}>
            <p style={{
              color: 'var(--primary)', fontSize: '12px', fontWeight: 800,
              marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
              Welcome back
            </p>
            <h2 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '26px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em',
            }}>
              Sign in to your account
            </h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '14px', lineHeight: 1.6 }}>
              Continue managing your subscriptions and renewal reminders.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <InputField
              id="login-email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              required
              icon={<EmailIcon />}
            />
            <InputField
              id="login-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
              icon={<LockIcon />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    background: 'none', border: 'none', padding: '2px',
                    color: 'var(--text-subtle)', cursor: 'pointer', display: 'flex',
                    transform: 'none',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon closed={showPassword} />
                </button>
              }
            />

            <Motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              id="login-submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px 16px',
                background: 'var(--gradient-brand)', color: '#fff',
                fontSize: '15px', fontWeight: 700, border: 'none',
                borderRadius: '14px', marginBottom: '0',
                boxShadow: '0 8px 24px var(--primary-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                marginTop: '4px',
              }}
            >
              {loading ? (
                <><span className="spinner" />&nbsp;Signing in...</>
              ) : 'Sign in'}
            </Motion.button>
          </form>

          {/* Divider */}
          <div className="divider-or" style={{ margin: '22px 0' }}>OR</div>

          {/* Google button */}
          <Motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            id="google-login"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '13px 16px',
              background: 'var(--surface-soft)', color: 'var(--text)',
              border: '1.5px solid var(--border)', fontWeight: 700,
              borderRadius: '14px',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
            }}
          >
            {googleLoading ? (
              <><span className="spinner spinner-dark" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />&nbsp;Opening Google...</>
            ) : (
              <><GoogleIcon />Continue with Google + Gmail</>
            )}
          </Motion.button>

          <p style={{ marginTop: '10px', color: 'var(--text-subtle)', fontSize: '11px', lineHeight: 1.5, textAlign: 'center' }}>
            Gmail permission is used only to detect subscription-related emails.
          </p>

          <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '14px', color: 'var(--text-muted)' }}>
            No account?{' '}
            <Link to="/register" id="go-to-register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 800 }}>
              Create one free
            </Link>
          </p>
        </Motion.div>
      </main>
    </div>
  );
}
