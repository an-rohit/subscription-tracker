import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

/* ── Framer variants ── */
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

/* ── Icons ── */
const MoneyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 6v12M9 9.5c0-1.1.9-2 2-2h2.5a2 2 0 0 1 0 4H10a2 2 0 0 0 0 4H12.5a2 2 0 0 0 2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <rect x="7" y="13" width="3" height="3" rx="1" fill="currentColor" />
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M7 14l4-5 4 3 4-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M10.3 3.4 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
    <path d="m2 8 10 7 10-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 12a8 8 0 0 1-13.7 5.7L4 15m0 0v5h5M4 12A8 8 0 0 1 17.7 6.3L20 9m0 0V4h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ChevronIcon = ({ down }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d={down ? "M6 9l6 6 6-6" : "M6 15l6-6 6 6"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Service favicon ── */
const ServiceLogo = ({ sub }) => {
  const [failed, setFailed] = useState(false);
  const domain = sub.domain;
  if (domain && !failed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt=""
        onError={() => setFailed(true)}
        style={{
          width: 32, height: 32, borderRadius: '9px', objectFit: 'contain',
          background: 'var(--surface-raised)', border: '1px solid var(--border)',
          padding: 3, flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span style={{
      width: 32, height: 32, borderRadius: '9px', flexShrink: 0,
      background: 'var(--gradient-brand)', color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '13px', fontWeight: 800,
    }}>
      {sub.name?.[0]?.toUpperCase() || 'S'}
    </span>
  );
};

/* ── Status badge ── */
const StatusBadge = ({ status }) => {
  const map = {
    active:    { cls: 'badge badge-success', label: 'Active' },
    detected:  { cls: 'badge badge-primary', label: 'Detected' },
    expired:   { cls: 'badge badge-danger',  label: 'Expired' },
    paused:    { cls: 'badge badge-warning', label: 'Paused' },
    cancelled: { cls: 'badge badge-muted',   label: 'Cancelled' },
  };
  const cfg = map[status] || { cls: 'badge badge-muted', label: status };
  return <span className={cfg.cls}>{cfg.label}</span>;
};

/* ── Skeleton card ── */
const SkeletonCard = () => (
  <div style={{
    background: 'var(--surface-raised)', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '24px',
    boxShadow: 'var(--shadow)',
  }}>
    <div className="skeleton" style={{ height: '13px', width: '55%', marginBottom: '14px' }} />
    <div className="skeleton" style={{ height: '36px', width: '70%', marginBottom: '10px' }} />
    <div className="skeleton" style={{ height: '10px', width: '40%' }} />
  </div>
);

/* ── KPI card ── */
const KpiCard = ({ label, value, color, icon, hint, isSelected, onClick, delay }) => (
  <Motion.div
    variants={fadeUp}
    whileHover={{ y: -3, boxShadow: `0 12px 36px color-mix(in srgb, ${color} 16%, transparent)` }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    style={{
      background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
      border: isSelected ? `1.5px solid ${color}` : '1px solid var(--border)',
      borderRadius: '20px',
      padding: '22px',
      boxShadow: isSelected
        ? `0 8px 32px color-mix(in srgb, ${color} 20%, transparent), var(--shadow)`
        : 'var(--shadow)',
      backdropFilter: 'blur(18px)',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.25s',
    }}
  >
    {/* Top accent bar */}
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', borderRadius: '20px 20px 0 0', background: color }} />

    {/* Icon */}
    <div style={{
      width: 38, height: 38, borderRadius: '12px', marginBottom: '14px',
      background: `color-mix(in srgb, ${color} 14%, transparent)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: color,
    }}>
      {icon}
    </div>

    <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginBottom: '8px', lineHeight: 1.3 }}>
      {label}
    </p>
    <Motion.p
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.1 + 0.3 }}
      style={{ fontSize: '28px', fontWeight: 800, color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {value}
    </Motion.p>
  </Motion.div>
);

/* ── Time of day greeting ── */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/* ── Helpers ── */
const getDaysLeft = (date) => {
  if (!date) return null;
  const today = new Date(); const renewal = new Date(date);
  today.setHours(0, 0, 0, 0); renewal.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((renewal - today) / (1000 * 60 * 60 * 24)));
};

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gmailScanning, setGmailScanning] = useState(false);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [scanLogs, setScanLogs] = useState([]);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('Monthly Spend');
  const [spendView, setSpendView] = useState('monthly');
  const [expandedRenewalId, setExpandedRenewalId] = useState(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [summaryRes, upcomingRes, subsRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/upcoming-renewals'),
        api.get('/subscriptions'),
      ]);
      setSummary(summaryRes.data);
      setUpcoming(upcomingRes.data.upcomingRenewals);
      const validSubscriptions = (subsRes.data.subscriptions || [])
        .filter(sub => !(sub.status === 'detected' && Number(sub.cost) <= 0));
      setSubscriptions(validSubscriptions);
      setSelectedSubscriptionId(current => current || validSubscriptions?.[0]?.id || null);
      try {
        const logsRes = await api.get('/gmail/scan-logs');
        setScanLogs(logsRes.data.logs || []);
      } catch { setScanLogs([]); }
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleGmailScan = async () => {
    setGmailScanning(true);
    setLastScanResult(null);
    try {
      const res = await api.post('/gmail/scan');
      setLastScanResult(res.data);
      toast.success(`Scan complete: ${res.data.subscriptionsFound} subscriptions found`);
      await fetchData();
      window.dispatchEvent(new Event('subscription-reminders:refresh'));
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Connect Google/Gmail first, then try scanning again';
      toast.error(errorMessage);
      if (/gmail is not connected|gmail permission is missing/i.test(errorMessage)) {
        await handleGoogleReconnect();
      }
    } finally {
      setGmailScanning(false);
    }
  };

  const handleGoogleReconnect = async () => {
    setGmailConnecting(true);
    try {
      const res = await api.post('/auth/google');
      window.location.href = res.data.authUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open Google consent');
      setGmailConnecting(false);
    }
  };

  const activeSubscriptions    = subscriptions.filter(s => s.status === 'active');
  const detectedSubscriptions  = subscriptions.filter(s => s.status === 'detected');
  const expiredSubscriptions   = subscriptions.filter(s => s.status === 'expired');
  const pausedSubscriptions    = subscriptions.filter(s => s.status === 'paused');
  const cancelledSubscriptions = subscriptions.filter(s => s.status === 'cancelled');
  const trackedSubscriptions   = subscriptions.filter(s => ['active', 'detected'].includes(s.status));
  const selectedSubscription   = subscriptions.find(s => s.id === selectedSubscriptionId) || subscriptions[0];
  const spendAmount = spendView === 'monthly' ? summary?.estimatedMonthlySpend || 0 : summary?.estimatedYearlySpend || 0;

  const summaryCards = [
    { label: 'Monthly Spend',          value: `Rs ${summary?.estimatedMonthlySpend || 0}`,   color: 'var(--primary)', icon: <MoneyIcon /> },
    { label: 'Yearly Spend',           value: `Rs ${summary?.estimatedYearlySpend || 0}`,    color: 'var(--success)', icon: <ChartIcon /> },
    { label: 'Tracked Subscriptions',  value: summary?.totalActiveSubscriptions || 0,         color: 'var(--warning)', icon: <CalendarIcon /> },
    { label: 'Renewals This Week',     value: upcoming?.length || 0,                          color: 'var(--danger)',  icon: <AlertIcon /> },
  ];

  const selectedMetricHint = {
    'Monthly Spend': 'Your estimated recurring spend this month.',
    'Yearly Spend': 'Your projected annual subscription total.',
    'Tracked Subscriptions': `${activeSubscriptions.length} active, ${pausedSubscriptions.length} paused, ${cancelledSubscriptions.length} cancelled.`,
    'Renewals This Week': 'Subscriptions renewing in the next 7 days.',
  }[selectedMetric];

  /* ── Loading skeleton ── */
  if (loading) return (
    <div className="app-shell">
      {/* Hero skeleton */}
      <div style={{
        background: 'var(--surface-raised)', border: '1px solid var(--border)',
        borderRadius: '24px', padding: '28px 28px', marginBottom: '24px',
        boxShadow: 'var(--shadow)',
      }}>
        <div className="skeleton" style={{ height: '12px', width: '22%', marginBottom: '14px' }} />
        <div className="skeleton" style={{ height: '36px', width: '48%', marginBottom: '10px' }} />
        <div className="skeleton" style={{ height: '14px', width: '60%' }} />
      </div>
      {/* KPI skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
      {/* Content skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );

  return (
    <Motion.div initial="hidden" animate="show" variants={stagger} className="app-shell">

      {/* ══ Hero Banner ══ */}
      <Motion.div
        variants={fadeUp}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '18px',
          alignItems: 'flex-start',
          marginBottom: '24px',
          padding: '28px 32px',
          borderRadius: '24px',
          background: 'var(--gradient-panel), var(--surface-raised)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          backdropFilter: 'blur(20px)',
          flexWrap: 'wrap',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-glow), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '30%', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <p style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Account overview
          </p>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.02em' }}>
            {getGreeting()}, {user?.name}! 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '14px', lineHeight: 1.6, maxWidth: 440 }}>
            Track renewals, spending, and subscription health from one focused workspace.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start', position: 'relative' }}>
          <button
            type="button"
            onClick={handleGmailScan}
            disabled={gmailScanning}
            style={{
              background: 'var(--success)', color: '#fff',
              border: 'none', padding: '10px 16px',
              borderRadius: '12px', fontWeight: 700, fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '7px',
              boxShadow: '0 6px 18px color-mix(in srgb, var(--success) 28%, transparent)',
            }}
          >
            {gmailScanning ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Scanning...</> : <><MailIcon />Scan Gmail</>}
          </button>
          <button
            type="button"
            onClick={handleGoogleReconnect}
            disabled={gmailConnecting}
            style={{
              background: 'var(--surface-raised)', color: 'var(--text)',
              border: '1px solid var(--border)', padding: '10px 16px',
              borderRadius: '12px', fontWeight: 700, fontSize: '13px',
            }}
          >
            {gmailConnecting ? 'Opening...' : 'Connect Gmail'}
          </button>
          <button
            type="button"
            onClick={fetchData}
            disabled={refreshing}
            style={{
              background: 'var(--surface-raised)', color: 'var(--text-muted)',
              border: '1px solid var(--border)', padding: '10px 14px',
              borderRadius: '12px', fontWeight: 700, fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <Motion.span
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={{ repeat: refreshing ? Infinity : 0, duration: 0.8, ease: 'linear' }}
              style={{ display: 'inline-flex' }}
            >
              <RefreshIcon />
            </Motion.span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            to="/subscriptions"
            style={{
              background: 'var(--gradient-brand)', color: '#fff',
              padding: '10px 16px', borderRadius: '12px',
              textDecoration: 'none', fontSize: '13px', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '7px',
              boxShadow: '0 6px 18px var(--primary-glow)',
            }}
          >
            <PlusIcon />Add Subscription
          </Link>
        </div>
      </Motion.div>

      {/* ══ Gmail Scan Section ══ */}
      <Motion.div
        variants={fadeUp}
        style={{
          background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '22px 24px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.25, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Gmail Subscription Detection
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 5, lineHeight: 1.6, maxWidth: 520 }}>
              Scan selected Gmail messages, detect subscription emails, and auto-add them to your dashboard.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleGoogleReconnect}
              disabled={gmailConnecting}
              style={{
                padding: '10px 16px', fontWeight: 700, fontSize: '13px',
                background: 'var(--surface-soft)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '12px',
              }}
            >
              {gmailConnecting ? 'Opening...' : 'Connect Gmail'}
            </button>
            <button
              type="button"
              onClick={handleGmailScan}
              disabled={gmailScanning}
              style={{
                padding: '10px 18px', fontWeight: 700, fontSize: '13px',
                background: 'var(--gradient-brand)', color: '#fff',
                border: 'none', borderRadius: '12px',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 6px 20px var(--primary-glow)',
              }}
            >
              {gmailScanning ? <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />Scanning emails...</> : <><MailIcon />Scan Gmail for subscriptions</>}
            </button>
          </div>
        </div>

        {lastScanResult && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 16 }}>
            {[
              { label: 'Emails scanned', value: lastScanResult.emailsScanned },
              { label: 'Subscriptions found', value: lastScanResult.subscriptionsFound },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                <p style={{ color: 'var(--text-subtle)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', marginTop: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {scanLogs.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Recent scans</p>
            <div style={{ display: 'grid', gap: 6 }}>
              {scanLogs.slice(0, 3).map(log => (
                <div key={log.id} style={{
                  display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                  padding: '10px 14px', background: 'var(--surface-soft)',
                  border: '1px solid var(--border)', borderRadius: '10px', fontSize: 12, alignItems: 'center',
                }}>
                  <span style={{ color: 'var(--text-subtle)' }}>{new Date(log.scanStartedAt).toLocaleString()}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`badge ${log.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>{log.status}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{log.emailsScanned} emails · {log.subscriptionsFound} found</span>
                  </div>
                  {log.errorMessage && <span style={{ color: 'var(--danger)', flexBasis: '100%', fontWeight: 700, fontSize: 11 }}>{log.errorMessage}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Motion.div>

      {/* ══ KPI Cards ══ */}
      <Motion.div
        variants={stagger}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}
      >
        {summaryCards.map((card, i) => (
          <KpiCard
            key={card.label}
            {...card}
            delay={i}
            isSelected={selectedMetric === card.label}
            onClick={() => setSelectedMetric(card.label)}
          />
        ))}
      </Motion.div>

      {/* ══ Spend Snapshot + Status Breakdown ══ */}
      <Motion.div
        variants={fadeUp}
        style={{
          background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
          border: '1px solid var(--border)',
          borderRadius: '20px', padding: '24px',
          marginBottom: '24px', boxShadow: 'var(--shadow)',
          backdropFilter: 'blur(18px)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px',
        }}
      >
        {/* Spend */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.25, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Spend Snapshot</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', lineHeight: 1.5 }}>{selectedMetricHint}</p>
            </div>
            {/* Toggle */}
            <div style={{ display: 'flex', background: 'var(--surface-muted)', borderRadius: '10px', padding: '3px', gap: '2px', flexShrink: 0 }}>
              {['monthly', 'yearly'].map(view => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setSpendView(view)}
                  style={{
                    background: spendView === view ? 'var(--primary)' : 'transparent',
                    color: spendView === view ? '#fff' : 'var(--text-muted)',
                    padding: '6px 14px', borderRadius: '8px',
                    textTransform: 'capitalize', fontSize: '13px', fontWeight: 700,
                    border: 'none', transition: 'background 0.2s, color 0.2s',
                  }}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          <Motion.div
            key={spendView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '38px', fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
          >
            Rs {spendAmount}
          </Motion.div>

          {/* Progress bar */}
          <div style={{ height: '8px', background: 'var(--surface-muted)', borderRadius: '999px', overflow: 'hidden', marginTop: '20px' }}>
            <Motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Number(summary?.totalActiveSubscriptions || 0) * 12)}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', background: 'var(--gradient-brand)', borderRadius: '999px' }}
            />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '8px' }}>
            Based on {summary?.totalActiveSubscriptions || 0} active subscriptions
          </p>
        </div>

        {/* Status breakdown */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.25, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '14px' }}>Status Breakdown</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
            {[
              ['Active',    activeSubscriptions.length,    'var(--success)'],
              ['Detected',  detectedSubscriptions.length,  'var(--primary)'],
              ['Expired',   expiredSubscriptions.length,   'var(--danger)'],
              ['Paused',    pausedSubscriptions.length,    'var(--warning)'],
              ['Cancelled', cancelledSubscriptions.length, 'var(--text-muted)'],
              ['Tracked',   trackedSubscriptions.length,   'var(--accent)'],
            ].map(([label, value, color]) => (
              <Motion.div
                key={label}
                whileHover={{ y: -2, boxShadow: `0 6px 18px color-mix(in srgb, ${color} 14%, transparent)` }}
                style={{
                  background: 'var(--surface-soft)', border: '1px solid var(--border)',
                  borderRadius: '14px', padding: '14px 12px',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <p style={{ color: 'var(--text-subtle)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ color, fontSize: '26px', fontWeight: 800, marginTop: '6px', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
              </Motion.div>
            ))}
          </div>
        </div>
      </Motion.div>

      {/* ══ Upcoming Renewals + Recent Subscriptions ══ */}
      <Motion.div
        variants={stagger}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}
      >
        {/* Upcoming renewals */}
        <Motion.div
          variants={fadeUp}
          style={{
            background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
            border: '1px solid var(--border)', borderRadius: '20px',
            padding: '22px 24px', boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Upcoming Renewals</h2>
            <Link to="/timeline" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
              View timeline →
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-subtle)', fontSize: '14px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
              <p style={{ fontWeight: 700, color: 'var(--text-muted)' }}>All clear!</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>No renewals in the next 7 days</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '4px' }}>
              {upcoming.map((sub, i) => (
                <Motion.div
                  key={sub.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedRenewalId(expandedRenewalId === sub.id ? null : sub.id)}
                    onKeyDown={e => e.key === 'Enter' && setExpandedRenewalId(expandedRenewalId === sub.id ? null : sub.id)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', padding: '10px 12px', borderRadius: '12px',
                      background: expandedRenewalId === sub.id ? 'var(--surface-soft)' : 'transparent',
                      transition: 'background 0.15s',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <ServiceLogo sub={sub} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: '14px', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-subtle)', lineHeight: 1.4, marginTop: '2px' }}>
                          {new Date(sub.nextRenewalDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{
                        background: 'var(--warning-soft)', color: 'var(--warning)',
                        padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        Rs {sub.cost}
                      </span>
                      <ChevronIcon down={expandedRenewalId !== sub.id} />
                    </div>
                  </div>
                  {expandedRenewalId === sub.id && (
                    <Motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{
                        margin: '4px 12px 8px',
                        padding: '10px 12px',
                        background: 'var(--surface-soft)', borderRadius: '10px',
                        fontSize: '13px', color: 'var(--text-muted)',
                        border: '1px solid var(--border-soft)',
                        display: 'flex', gap: '12px', flexWrap: 'wrap',
                      }}
                    >
                      <span>⏳ {getDaysLeft(sub.nextRenewalDate)} days left</span>
                      <span>🔄 {sub.billingCycle} billing</span>
                      <span>📁 {sub.category?.name || 'Uncategorized'}</span>
                    </Motion.div>
                  )}
                </Motion.div>
              ))}
            </div>
          )}
        </Motion.div>

        {/* Recent subscriptions */}
        <Motion.div
          variants={fadeUp}
          style={{
            background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
            border: '1px solid var(--border)', borderRadius: '20px',
            padding: '22px 24px', boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent Subscriptions</h2>
            <Link to="/subscriptions" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>

          {subscriptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>No subscriptions yet</p>
              <Link to="/subscriptions" style={{
                background: 'var(--gradient-brand)', color: '#fff',
                padding: '9px 20px', borderRadius: '10px',
                textDecoration: 'none', fontSize: '13px', fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}>
                <PlusIcon />Add your first
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '4px' }}>
              {subscriptions.slice(0, 6).map((sub, i) => (
                <Motion.div
                  key={sub.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => setSelectedSubscriptionId(sub.id)}
                  whileHover={{ y: -1 }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: '12px', cursor: 'pointer',
                    background: selectedSubscriptionId === sub.id ? 'var(--primary-soft)' : 'transparent',
                    border: selectedSubscriptionId === sub.id ? '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' : '1px solid transparent',
                    transition: 'background 0.15s, border-color 0.15s',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <ServiceLogo sub={sub} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '14px', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-subtle)', lineHeight: 1.4, marginTop: '2px' }}>{sub.billingCycle}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <StatusBadge status={sub.status} />
                    <span style={{
                      color: sub.status === 'active' ? 'var(--success)' : 'var(--text-muted)',
                      fontSize: '14px', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                      Rs {sub.cost}
                    </span>
                  </div>
                </Motion.div>
              ))}
            </div>
          )}
        </Motion.div>
      </Motion.div>

      {/* ══ Selected Subscription Detail ══ */}
      {selectedSubscription && (
        <Motion.div
          variants={fadeUp}
          style={{
            background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
            border: '1px solid var(--border)', borderRadius: '20px',
            padding: '22px 24px', marginBottom: '24px',
            boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Selected Subscription</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '5px' }}>Click any subscription above to inspect details.</p>
            </div>
            <Link to="/subscriptions" style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
              Manage →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            {[
              ['Service', selectedSubscription.name],
              ['Cost', `Rs ${selectedSubscription.cost}`],
              ['Cycle', selectedSubscription.billingCycle],
              ['Next Renewal', selectedSubscription.nextRenewalDate ? new Date(selectedSubscription.nextRenewalDate).toLocaleDateString() : 'Not set'],
              ['Status', <StatusBadge status={selectedSubscription.status} />],
            ].map(([label, value]) => (
              <div key={label} style={{
                background: 'var(--surface-soft)', border: '1px solid var(--border)',
                borderRadius: '14px', padding: '14px',
              }}>
                <p style={{ color: 'var(--text-subtle)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</p>
                <p style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.35 }}>{value}</p>
              </div>
            ))}
          </div>
        </Motion.div>
      )}

    </Motion.div>
  );
}
