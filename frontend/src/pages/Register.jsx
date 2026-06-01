import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import logo from '../assets/subtrackerlogo.png';

/* ── Icons ── */
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

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

/* ── Password strength ── */
const getPasswordStrength = (pwd) => {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
};

const strengthConfig = [
  { label: '', color: 'var(--border)' },
  { label: 'Weak', color: 'var(--danger)' },
  { label: 'Fair', color: 'var(--warning)' },
  { label: 'Good', color: 'var(--info)' },
  { label: 'Strong', color: 'var(--success)' },
];

const PasswordStrength = ({ password }) => {
  const strength = getPasswordStrength(password);
  const config = strengthConfig[strength];
  if (!password) return null;

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[1, 2, 3, 4].map(i => (
          <Motion.div
            key={i}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            style={{
              flex: 1, height: '4px', borderRadius: '999px',
              background: i <= strength ? config.color : 'var(--border)',
              transformOrigin: 'left',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: '11px', color: config.color, fontWeight: 700, textAlign: 'right' }}>
        {config.label}
      </p>
    </div>
  );
};

/* ── Input Field ── */
const InputField = ({ icon, label, id, type, placeholder, value, onChange, autoComplete, required, rightElement, note }) => (
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
    {note}
  </div>
);

/* ── Floating Shape ── */
const FloatingShape = ({ style, delay = 0 }) => (
  <Motion.div
    animate={{ y: [0, -10, 0], rotate: [0, -4, 0] }}
    transition={{ duration: 7 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    style={{
      position: 'absolute',
      borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
      opacity: 0.11,
      ...style,
    }}
  />
);

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      login(res.data.user, res.data.token);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { value: '7-day', label: 'Renewal alerts' },
    { value: 'AI', label: 'Guided add' },
    { value: 'DBMS', label: 'Trigger logic' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' }}>

      {/* ── Form Panel (left) ── */}
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
            maxWidth: '460px',
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
              Get started free
            </p>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '26px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em',
            }}>
              Create your workspace
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '14px', lineHeight: 1.6 }}>
              Build a clean renewal system for every recurring payment.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <InputField
              id="register-name"
              label="Full name"
              type="text"
              placeholder="Rohit Sharma"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              autoComplete="name"
              required
              icon={<UserIcon />}
            />
            <InputField
              id="register-email"
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
              id="register-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a secure password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
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
              note={<PasswordStrength password={form.password} />}
            />

            <Motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              id="register-submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px 16px', marginTop: '6px',
                background: 'var(--gradient-brand)', color: '#fff',
                fontSize: '15px', fontWeight: 700, border: 'none',
                borderRadius: '14px',
                boxShadow: '0 8px 24px var(--primary-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}
            >
              {loading ? (
                <><span className="spinner" />&nbsp;Creating account...</>
              ) : 'Create account'}
            </Motion.button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '14px', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" id="go-to-login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 800 }}>
              Sign in
            </Link>
          </p>
        </Motion.div>
      </main>

      {/* ── Brand Panel (right) ── */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px',
        background: 'linear-gradient(135deg, #0d2818 0%, #0a1628 40%, #1e1065 75%, #2d1b69 100%)',
        color: '#fff',
      }}>
        {/* Floating shapes */}
        <FloatingShape delay={0} style={{ width: 260, height: 260, top: '-50px', left: '-60px', background: 'linear-gradient(135deg, #10b981, #0f766e)' }} />
        <FloatingShape delay={2} style={{ width: 200, height: 200, bottom: '100px', right: '-40px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
        <FloatingShape delay={1} style={{ width: 100, height: 100, top: '45%', left: '15%', background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }} />

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
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
              Start organized
            </div>
            <h2 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(36px, 4.5vw, 58px)',
              fontWeight: 800, lineHeight: 1.05,
              letterSpacing: '-0.03em', color: '#fff',
              maxWidth: 560,
            }}>
              Turn subscription chaos into a simple monthly picture.
            </h2>
            <p style={{ marginTop: '18px', maxWidth: 500, color: 'rgba(255,255,255,0.72)', fontSize: '16px', lineHeight: 1.7 }}>
              Add services, track renewal dates, view category spend, and keep payment history clean with database-level automation.
            </p>
          </Motion.div>
        </div>

        {/* Stats */}
        <Motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          style={{ position: 'relative', zIndex: 2 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {stats.map(({ value, label }, i) => (
              <Motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '16px',
                  padding: '20px 16px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <p style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {value}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.68)', marginTop: '6px', fontWeight: 500 }}>
                  {label}
                </p>
              </Motion.div>
            ))}
          </div>
        </Motion.div>
      </section>
    </div>
  );
}
