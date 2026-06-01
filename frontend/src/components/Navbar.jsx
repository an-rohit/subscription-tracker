import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import logo from '../assets/subtrackerlogo.png';

/* ── Icons ── */
const BellIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M15 17H9m9-2v-4a6 6 0 0 0-12 0v4l-2 2h16l-2-2Zm-4 4a2 2 0 0 1-4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 12a8 8 0 0 1-13.7 5.7L4 15m0 0v5h5M4 12A8 8 0 0 1 17.7 6.3L20 9m0 0V4h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/* ── Helpers ── */
const getReminderKey = (r) => `${r.id}-${r.nextRenewalDate}`;
const getLogoUrl = (domain) => domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

const getDaysLeft = (date) => {
  if (!date) return null;
  const today = new Date(); const renewal = new Date(date);
  today.setHours(0, 0, 0, 0); renewal.setHours(0, 0, 0, 0);
  return Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));
};

const formatReminderText = (r) => {
  const d = getDaysLeft(r.nextRenewalDate);
  if (d < 0) return `${r.name} expired ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ago`;
  if (d === 0) return `${r.name} renews today`;
  if (d === 1) return `${r.name} renews tomorrow`;
  return `${r.name} renews in ${d} days`;
};

const getRenewUrl = (domain) => {
  if (!domain) return null;
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
};

const getUrgencyStyle = (date) => {
  const d = getDaysLeft(date);
  if (d <= 0) return { bg: 'var(--danger-soft)', color: 'var(--danger)', label: 'Overdue' };
  if (d <= 2) return { bg: 'var(--warning-soft)', color: 'var(--warning)', label: `${d}d` };
  return { bg: 'var(--primary-soft)', color: 'var(--primary)', label: `${d}d` };
};

/* ── NavLink style ── */
const navLinkStyle = ({ isActive }) => ({
  textDecoration: 'none',
  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
  fontSize: '14px',
  fontWeight: 700,
  lineHeight: 1.2,
  padding: '8px 14px',
  borderRadius: '10px',
  background: isActive ? 'var(--primary-soft)' : 'transparent',
  border: isActive ? '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' : '1px solid transparent',
  transition: 'background 0.2s, color 0.2s, border-color 0.2s',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
});

/* ── Pull Lamp Dark Toggle (original, preserved) ── */
const PullLampToggle = ({ isDark, onToggle }) => {
  const [pulling, setPulling] = useState(false);
  const handlePull = () => {
    setPulling(true);
    onToggle();
    window.setTimeout(() => setPulling(false), 620);
  };

  return (
    <Motion.button
      type="button"
      onClick={handlePull}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Pull for light mode' : 'Pull for dark mode'}
      initial={false}
      animate={pulling ? 'pull' : isDark ? 'dark' : 'light'}
      style={{
        width: 72,
        height: 42,
        padding: 0,
        position: 'relative',
        overflow: 'visible',
        background: isDark
          ? 'linear-gradient(135deg, #111827, #1f2937)'
          : 'linear-gradient(135deg, #fff7ed, #eef2ff)',
        color: isDark ? '#fbbf24' : '#3730a3',
        border: '1px solid var(--border)',
        borderRadius: 14,
        boxShadow: isDark
          ? 'inset 0 0 18px rgba(251,191,36,0.10), 0 8px 24px rgba(0,0,0,0.22)'
          : 'inset 0 0 18px rgba(251,191,36,0.22), 0 8px 24px rgba(99,102,241,0.14)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        flexShrink: 0,
      }}
    >
      <Motion.span
        variants={{ light: { opacity: 0.55, scale: 1.2 }, dark: { opacity: 0.18, scale: 0.8 } }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'absolute', width: 58, height: 48, borderRadius: '999px',
          background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.58), rgba(251,191,36,0.22) 38%, transparent 72%)',
          top: 18, left: 7, pointerEvents: 'none',
        }}
      />
      <Motion.svg width="56" height="38" viewBox="0 0 60 42" fill="none" aria-hidden="true"
        variants={{ light: { y: 0 }, dark: { y: 1 }, pull: { y: [0, 4, -1, 0], rotate: [0, -2, 2, 0] } }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <Motion.path d="M30 2V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
          variants={{ light: { pathLength: 1, opacity: 0.85 }, dark: { pathLength: 1, opacity: 0.65 }, pull: { pathLength: [1, 0.82, 1] } }}
        />
        <Motion.path d="M21 13H39L46 28H14L21 13Z" fill="currentColor"
          variants={{ light: { opacity: 0.96 }, dark: { opacity: 0.72 } }}
        />
        <Motion.path d="M14 28H46" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          variants={{ light: { opacity: 0.78 }, dark: { opacity: 0.45 } }}
        />
        <Motion.path d="M22 13C23.8 9.8 26.5 8.2 30 8.2C33.5 8.2 36.2 9.8 38 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.65" />
      </Motion.svg>
      <Motion.svg aria-hidden="true" width="44" height="78" viewBox="0 0 46 82" fill="none"
        variants={{
          light: { y: 0, rotate: 1, opacity: 0.95 },
          dark: { y: 0, rotate: -1, opacity: 0.82 },
          pull: { y: [0, 18, 7, 14, 4, 0], rotate: [0, -10, 12, -8, 5, 0], opacity: 1 },
        }}
        transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'absolute', top: 21, right: -3, transformOrigin: 'top center', pointerEvents: 'none', zIndex: 3 }}
      >
        <Motion.path
          variants={{
            light: { d: 'M22 0 C22 16 22 28 22 46 C22 55 26 60 29 66' },
            dark: { d: 'M22 0 C22 16 22 28 22 46 C22 55 18 60 15 66' },
            pull: { d: ['M22 0 C22 16 22 28 22 46 C22 55 22 60 22 66', 'M22 0 C17 18 30 34 24 50 C20 58 18 63 16 70', 'M22 0 C29 18 16 35 22 51 C26 59 29 63 31 69', 'M22 0 C18 18 27 34 23 50 C20 58 19 63 20 67', 'M22 0 C25 18 19 34 22 50 C24 58 25 63 24 67', 'M22 0 C22 16 22 28 22 46 C22 55 22 60 22 66'] },
          }}
          stroke={isDark ? '#fbbf24' : '#4f46e5'} strokeWidth="2" strokeLinecap="round" fill="none"
          style={{ filter: isDark ? 'drop-shadow(0 0 5px rgba(251,191,36,0.35))' : 'drop-shadow(0 4px 6px rgba(79,70,229,0.22))' }}
        />
        <Motion.circle
          variants={{ light: { cx: 29, cy: 66 }, dark: { cx: 15, cy: 66 }, pull: { cx: [22, 16, 31, 20, 24, 22], cy: [66, 70, 69, 67, 67, 66] } }}
          r="5.5" fill={isDark ? '#fbbf24' : '#6366f1'} stroke="var(--surface)" strokeWidth="2"
          style={{ filter: isDark ? 'drop-shadow(0 0 9px rgba(251,191,36,0.55))' : 'drop-shadow(0 7px 10px rgba(99,102,241,0.3))' }}
        />
      </Motion.svg>
    </Motion.button>
  );
};

/* ── Reminder Logo ── */
const ReminderLogo = ({ reminder }) => {
  const [failed, setFailed] = useState(false);
  const logoUrl = !failed ? getLogoUrl(reminder.domain) : null;

  if (!logoUrl) {
    return (
      <span style={{
        width: 36, height: 36, borderRadius: '10px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--gradient-brand)', color: '#fff', fontSize: '14px',
        fontWeight: 800, flexShrink: 0,
      }}>
        {reminder.name?.[0]?.toUpperCase() || 'S'}
      </span>
    );
  }

  return (
    <img src={logoUrl} alt="" onError={() => setFailed(true)} style={{
      width: 36, height: 36, borderRadius: '10px', objectFit: 'contain',
      background: 'var(--surface-raised)', border: '1px solid var(--border)', padding: 4, flexShrink: 0,
    }} />
  );
};

/* ── Avatar Pill ── */
const AvatarPill = ({ name }) => {
  const initials = name ? name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) : '?';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '4px 12px 4px 4px',
      background: 'var(--surface-soft)',
      border: '1px solid var(--border)',
      borderRadius: '999px',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--gradient-brand)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 800, color: '#fff', flexShrink: 0,
      }}>
        {initials}
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
        {name}
      </span>
    </div>
  );
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [refreshingReminders, setRefreshingReminders] = useState(false);
  const [lastReminderSync, setLastReminderSync] = useState(null);
  const [readReminderKeys, setReadReminderKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem('readRenewalReminders') || '[]'); }
    catch { return []; }
  });
  const [showReminders, setShowReminders] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fetchReminders = async () => {
      setRefreshingReminders(true);
      try {
        const res = await api.get('/analytics/upcoming-renewals');
        setReminders(res.data.upcomingRenewals || []);
        setLastReminderSync(new Date());
      } catch {
        setReminders([]);
      } finally {
        setRefreshingReminders(false);
      }
    };

    fetchReminders();
    const intervalId = window.setInterval(fetchReminders, 30000);
    const handleFocus = () => fetchReminders();
    const handleSubscriptionChange = () => fetchReminders();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('subscription-reminders:refresh', handleSubscriptionChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('subscription-reminders:refresh', handleSubscriptionChange);
    };
  }, []);

  const unreadReminders = useMemo(
    () => reminders.filter(r => !readReminderKeys.includes(getReminderKey(r))),
    [reminders, readReminderKeys]
  );

  const markReminderRead = (reminder) => {
    const key = getReminderKey(reminder);
    setReadReminderKeys(current => {
      if (current.includes(key)) return current;
      const next = [...current, key];
      localStorage.setItem('readRenewalReminders', JSON.stringify(next));
      return next;
    });
  };

  const markAllRead = () => {
    const allKeys = reminders.map(getReminderKey);
    setReadReminderKeys(allKeys);
    localStorage.setItem('readRenewalReminders', JSON.stringify(allKeys));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/subscriptions', label: 'Subscriptions' },
    { to: '/timeline', label: 'Timeline' },
    { to: '/analytics', label: 'Analytics' },
  ];

  return (
    <nav style={{
      background: 'color-mix(in srgb, var(--surface) 90%, transparent)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: '66px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(24px)',
      boxShadow: '0 1px 0 var(--border-soft), 0 4px 24px rgba(0,0,0,0.04)',
      transition: 'background 0.2s, border-color 0.2s',
    }}>

      {/* ── Left: Logo + Nav links ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        {/* Logo */}
        <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', marginRight: '12px', flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '11px',
            background: 'var(--surface-soft)', border: '1px solid var(--border)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <img src={logo} alt="SubTracker logo" style={{ width: 40, height: 40, borderRadius: 11, objectFit: 'cover' }} />
          </div>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: '17px', letterSpacing: '-0.02em',
            color: 'var(--text)',
          }}>
            SubTracker
          </span>
        </NavLink>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', gap: '2px' }} className="nav-links-desktop">
          {navLinks.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} style={navLinkStyle}>
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── Right: Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, position: 'relative' }}>

        {/* Bell */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            id="notification-bell"
            onClick={() => setShowReminders(c => !c)}
            aria-label="Open renewal reminders"
            style={{
              width: 38, height: 38,
              background: showReminders ? 'var(--primary-soft)' : 'var(--surface-soft)',
              color: showReminders ? 'var(--primary)' : 'var(--text-muted)',
              border: showReminders ? '1px solid color-mix(in srgb, var(--primary) 30%, transparent)' : '1px solid var(--border)',
              borderRadius: '11px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              transition: 'background 0.2s, color 0.2s, border-color 0.2s',
            }}
          >
            <Motion.span
              animate={unreadReminders.length > 0 ? { rotate: [0, -12, 12, -6, 6, 0] } : { rotate: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              style={{ display: 'inline-flex' }}
            >
              <BellIcon />
            </Motion.span>
            <AnimatePresence>
              {unreadReminders.length > 0 && (
                <Motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  style={{
                    position: 'absolute', top: '-5px', right: '-5px',
                    minWidth: '18px', height: '18px', borderRadius: '999px',
                    background: 'var(--danger)', color: '#fff',
                    border: '2px solid var(--surface)',
                    fontSize: '10px', fontWeight: 800, lineHeight: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {unreadReminders.length}
                </Motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Reminder drawer */}
          <AnimatePresence>
            {showReminders && (
              <Motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, scale: 0.96, filter: 'blur(6px)' }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute', right: 0, top: '46px',
                  width: 'min(400px, calc(100vw - 24px))',
                  background: 'color-mix(in srgb, var(--surface-raised) 96%, transparent)',
                  border: '1px solid var(--border)',
                  borderRadius: '18px',
                  boxShadow: 'var(--shadow-strong)',
                  backdropFilter: 'blur(28px)',
                  padding: '16px',
                  zIndex: 200,
                }}
              >
                {/* Drawer header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-soft)',
                  gap: '12px',
                }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>Renewal reminders</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '2px' }}>
                      {refreshingReminders
                        ? 'Syncing...'
                        : lastReminderSync
                          ? `Updated ${lastReminderSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Next 7 days'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new Event('subscription-reminders:refresh'))}
                      title="Refresh"
                      style={{
                        width: 28, height: 28, background: 'var(--surface-soft)',
                        color: 'var(--text-muted)', border: '1px solid var(--border)',
                        borderRadius: '8px',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Motion.span
                        animate={refreshingReminders ? { rotate: 360 } : { rotate: 0 }}
                        transition={{ repeat: refreshingReminders ? Infinity : 0, duration: 0.8, ease: 'linear' }}
                        style={{ display: 'inline-flex' }}
                      >
                        <RefreshIcon />
                      </Motion.span>
                    </button>
                    {reminders.length > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        style={{
                          background: 'transparent', color: 'var(--primary)',
                          fontSize: '12px', fontWeight: 800, padding: '4px 8px',
                          border: 'none', borderRadius: '6px',
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {/* Reminder items */}
                {reminders.length === 0 ? (
                  <Motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'var(--surface-soft)', border: '1px solid var(--border-soft)',
                      borderRadius: '12px', padding: '24px 16px',
                      textAlign: 'center', color: 'var(--text-muted)',
                    }}
                  >
                    <span style={{
                      display: 'inline-flex', width: 40, height: 40, borderRadius: '12px',
                      alignItems: 'center', justifyContent: 'center',
                      background: 'var(--primary-soft)', color: 'var(--primary)', marginBottom: 10,
                    }}>
                      <BellIcon />
                    </span>
                    <p style={{ fontWeight: 800, color: 'var(--text)', fontSize: 14 }}>No renewals due soon</p>
                    <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-subtle)' }}>Clear for the next 7 days.</p>
                  </Motion.div>
                ) : (
                  <div style={{ display: 'grid', gap: '6px', maxHeight: '340px', overflowY: 'auto', paddingRight: '2px' }}>
                    {reminders.map((reminder, index) => {
                      const isRead = readReminderKeys.includes(getReminderKey(reminder));
                      const urgency = getUrgencyStyle(reminder.nextRenewalDate);
                      return (
                        <Motion.div
                          key={getReminderKey(reminder)}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          whileHover={{ y: -1 }}
                          style={{
                            background: isRead ? 'var(--surface-soft)' : 'linear-gradient(135deg, var(--primary-soft), var(--surface-soft))',
                            border: isRead ? '1px solid var(--border)' : '1px solid color-mix(in srgb, var(--primary) 35%, var(--border))',
                            borderRadius: '12px', padding: '10px 12px',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            boxShadow: isRead ? 'none' : '0 4px 16px var(--primary-glow)',
                          }}
                        >
                          <ReminderLogo reminder={reminder} />
                          <span style={{ display: 'grid', gap: 3, minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
                              {formatReminderText(reminder)}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Rs {reminder.cost} / {reminder.billingCycle} · {new Date(reminder.nextRenewalDate).toLocaleDateString()}
                            </span>
                          </span>

                          {/* Urgency badge */}
                          <span style={{
                            padding: '3px 8px', borderRadius: '999px', fontSize: '11px',
                            fontWeight: 800, background: urgency.bg, color: urgency.color, flexShrink: 0,
                          }}>
                            {urgency.label}
                          </span>

                          {getDaysLeft(reminder.nextRenewalDate) <= 0 && getRenewUrl(reminder.domain) && (
                            <a
                              href={getRenewUrl(reminder.domain)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => markReminderRead(reminder)}
                              style={{
                                padding: '6px 10px', borderRadius: '8px',
                                background: 'var(--gradient-brand)', color: '#fff',
                                fontSize: 12, fontWeight: 800, textDecoration: 'none', flexShrink: 0,
                              }}
                            >
                              Renew
                            </a>
                          )}
                        </Motion.div>
                      );
                    })}
                  </div>
                )}
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar pill */}
        <AvatarPill name={user?.name} />

        {/* Theme toggle */}
        <PullLampToggle isDark={isDark} onToggle={toggleTheme} />

        {/* Logout */}
        <Motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          id="logout-btn"
          onClick={handleLogout}
          style={{
            background: 'var(--surface-soft)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            padding: '8px 14px',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '7px',
            fontSize: '13px', fontWeight: 700,
          }}
        >
          <LogoutIcon />
          <span className="logout-label">Logout</span>
        </Motion.button>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Toggle menu"
          style={{
            display: 'none', width: 36, height: 36,
            background: 'var(--surface-soft)', border: '1px solid var(--border)',
            borderRadius: '10px', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)',
          }}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* ── Mobile menu drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <Motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute', top: '66px', left: 0, right: 0,
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: '4px',
              zIndex: 99,
            }}
          >
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                style={({ isActive }) => ({
                  ...navLinkStyle({ isActive }),
                  display: 'flex',
                })}
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </Motion.div>
        )}
      </AnimatePresence>

      {/* ── Responsive CSS ── */}
      <style>{`
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .mobile-menu-btn { display: inline-flex !important; }
          .logout-label { display: none; }
        }
        @media (max-width: 500px) {
          nav { padding: 0 14px !important; }
        }
      `}</style>
    </nav>
  );
}
