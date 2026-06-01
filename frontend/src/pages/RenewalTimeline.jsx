import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────
   Variants
───────────────────────────────────────────── */
const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

/* ─────────────────────────────────────────────
   Helpers (all original logic, unchanged)
───────────────────────────────────────────── */
const cycleLabels = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

const formatDate = (date) =>
  new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getDaysAway = (date) => {
  const today  = startOfDay(new Date());
  const target = startOfDay(date);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const getUrgency = (date) => {
  const days = getDaysAway(date);
  if (days < 0)  return { label: 'Overdue', color: 'var(--danger)',  bg: 'var(--danger-soft)' };
  if (days === 0) return { label: 'Today',  color: 'var(--warning)', bg: 'var(--warning-soft)' };
  if (days <= 7) return { label: `${days}d`, color: 'var(--primary)', bg: 'var(--primary-soft)' };
  return           { label: `${days}d`, color: 'var(--success)', bg: 'var(--success-soft)' };
};

const getMonthlyCost = (sub) => {
  const cost = Number(sub.cost || 0);
  if (sub.billingCycle === 'yearly') return cost / 12;
  if (sub.billingCycle === 'weekly') return cost * 4;
  return cost;
};

const getCalendarDays = (date) => {
  const year  = date.getFullYear();
  const month = date.getMonth();
  const firstDay    = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks      = firstDay.getDay();
  return [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
};

const getLogoUrl = (domain) => domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
const SubscriptionLogo = ({ domain, name, size = 28 }) => {
  const [error, setError] = useState(false);
  const initial = name?.[0]?.toUpperCase() || 'S';
  if (!domain || error) {
    return (
      <div style={{
        width: size, height: size, borderRadius: Math.max(8, size / 4),
        background: 'var(--gradient-brand)', color: '#fff',
        display: 'grid', placeItems: 'center',
        fontSize: Math.max(11, size / 2.4), fontWeight: 800, flexShrink: 0,
      }}>
        {initial}
      </div>
    );
  }
  return (
    <img src={getLogoUrl(domain)} alt={name} onError={() => setError(true)} style={{
      width: size, height: size, borderRadius: Math.max(8, size / 4),
      objectFit: 'contain', background: 'var(--surface-raised)',
      border: '1px solid var(--border)', padding: 2, flexShrink: 0,
    }} />
  );
};

/* ─────────────────────────────────────────────
   Icons
───────────────────────────────────────────── */
const ChevronIcon = ({ left }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d={left ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);
const LinkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function RenewalTimeline() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [viewDate, setViewDate]           = useState(new Date());
  const [selectedId, setSelectedId]       = useState(null);
  const [filter, setFilter]               = useState('all');
  const [hoveredDay, setHoveredDay]       = useState(null);

  useEffect(() => { fetchSubscriptions(); }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await api.get('/subscriptions');
      setSubscriptions(res.data.subscriptions || []);
      setSelectedId(current => current || res.data.subscriptions?.[0]?.id || null);
    } catch { toast.error('Failed to load renewal timeline'); }
    finally  { setLoading(false); }
  };

  const activeSubscriptions = useMemo(
    () => subscriptions.filter(sub => sub.status !== 'cancelled'),
    [subscriptions]
  );

  const sortedRenewals = useMemo(() =>
    [...activeSubscriptions].sort((a, b) => new Date(a.nextRenewalDate) - new Date(b.nextRenewalDate)),
    [activeSubscriptions]
  );

  const filteredRenewals = useMemo(() => {
    if (filter === 'all')     return sortedRenewals;
    if (filter === 'week')    return sortedRenewals.filter(s => { const d = getDaysAway(s.nextRenewalDate); return d >= 0 && d <= 7; });
    if (filter === 'overdue') return sortedRenewals.filter(s => getDaysAway(s.nextRenewalDate) < 0);
    return sortedRenewals.filter(s => s.billingCycle === filter);
  }, [filter, sortedRenewals]);

  const selected       = sortedRenewals.find(s => s.id === selectedId) || sortedRenewals[0];
  const calendarDays   = getCalendarDays(viewDate);
  const monthLabel     = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const renewalsByDay  = useMemo(() =>
    activeSubscriptions.reduce((acc, sub) => {
      const key = new Date(sub.nextRenewalDate).toDateString();
      acc[key] = [...(acc[key] || []), sub];
      return acc;
    }, {}),
    [activeSubscriptions]
  );

  const monthRenewals = activeSubscriptions.filter(sub => {
    const d = new Date(sub.nextRenewalDate);
    return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
  });

  const stats = [
    { label: 'Due This Month', value: monthRenewals.length,                                                                                                 color: 'var(--primary)', icon: '📅' },
    { label: 'Due This Week',  value: activeSubscriptions.filter(s => { const d = getDaysAway(s.nextRenewalDate); return d >= 0 && d <= 7; }).length,        color: 'var(--warning)', icon: '⏰' },
    { label: 'Monthly Cashflow', value: `Rs ${activeSubscriptions.reduce((sum, s) => sum + getMonthlyCost(s), 0).toFixed(0)}`,                              color: 'var(--success)', icon: '💰' },
    { label: 'Overdue',        value: activeSubscriptions.filter(s => getDaysAway(s.nextRenewalDate) < 0).length,                                            color: 'var(--danger)', icon: '⚠️' },
  ];

  /* ── Skeleton loading ── */
  if (loading) return (
    <div className="app-shell">
      {/* Header skeleton */}
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 24, padding: '28px 32px', marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: 260, height: 32, borderRadius: 8, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: 340, height: 16, borderRadius: 4 }} />
        </div>
        <div className="skeleton" style={{ width: 180, height: 42, borderRadius: 12 }} />
      </div>

      {/* KPI skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 18, padding: 20 }}>
            <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 8, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: '60%', height: 14, borderRadius: 4, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: '80%', height: 26, borderRadius: 6 }} />
          </div>
        ))}
      </div>

      {/* Calendar + Details skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 }}>
        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 20, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <div className="skeleton" style={{ width: 140, height: 24, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: 120, height: 34, borderRadius: 8 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
            {[0,1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 12, borderRadius: 4 }} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {Array.from({ length: 35 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
          </div>
        </div>
        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 20, padding: 22 }}>
          <div className="skeleton" style={{ width: 140, height: 20, borderRadius: 4, marginBottom: 20 }} />
          <div className="skeleton" style={{ width: '100%', height: 70, borderRadius: 12, marginBottom: 24 }} />
          {[0,1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 60, height: 14, borderRadius: 4 }} />
            </div>
          ))}
          <div className="skeleton" style={{ width: '100%', height: 44, borderRadius: 12, marginTop: 24 }} />
        </div>
      </div>
    </div>
  );

  return (
    <Motion.div initial="hidden" animate="show" variants={stagger} className="app-shell">

      {/* ══ Page Header ══ */}
      <Motion.div
        variants={fadeUp}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 16, marginBottom: 24, padding: '28px 32px',
          borderRadius: 24,
          background: 'var(--gradient-panel), var(--surface-raised)',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
          flexWrap: 'wrap', position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-glow), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <p style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Schedule
          </p>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.02em' }}>
            Renewal Timeline
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginTop: 6 }}>
            Track upcoming renewals, overdue payments, and monthly cashflow.
          </p>
        </div>
        <Link
          to="/subscriptions"
          style={{
            background: 'var(--gradient-brand)', color: '#fff',
            padding: '10px 18px', borderRadius: 12,
            textDecoration: 'none', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 6px 18px var(--primary-glow)',
            position: 'relative',
          }}
        >
          <LinkIcon />Manage Subscriptions
        </Link>
      </Motion.div>

      {/* ══ Stat Cards ══ */}
      <Motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        {stats.map(stat => (
          <Motion.div
            key={stat.label}
            variants={fadeUp}
            whileHover={{ y: -4, boxShadow: `0 10px 30px color-mix(in srgb, ${stat.color} 16%, transparent)` }}
            style={{
              background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
              border: '1px solid var(--border)', borderRadius: 18, padding: 20,
              boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)',
              position: 'relative', overflow: 'hidden', transition: 'box-shadow 0.25s',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: stat.color, borderRadius: '18px 18px 0 0' }} />
            <p style={{ fontSize: 22, marginBottom: 6 }}>{stat.icon}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{stat.label}</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: stat.color, fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {stat.value}
            </p>
          </Motion.div>
        ))}
      </Motion.div>

      {/* ══ Calendar + Details ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.7fr)', gap: 18, alignItems: 'start', marginBottom: 18 }}>

        {/* Calendar */}
        <Motion.section
          variants={fadeUp}
          style={{
            position: 'relative', zIndex: 10,
            background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
            border: '1px solid var(--border)', borderRadius: 20, padding: 22,
            boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)',
          }}
        >
          {/* Calendar nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalIcon />
              </div>
              <div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800 }}>Calendar View</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{monthLabel}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                style={{ width: 34, height: 34, background: 'var(--surface-muted)', color: 'var(--text-muted)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronIcon left />
              </button>
              <button type="button"
                onClick={() => setViewDate(new Date())}
                style={{ padding: '7px 14px', background: 'var(--primary)', color: '#fff', borderRadius: 9, fontWeight: 700, fontSize: 13 }}>
                Today
              </button>
              <button type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                style={{ width: 34, height: 34, background: 'var(--surface-muted)', color: 'var(--text-muted)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronIcon />
              </button>
            </div>
          </div>

          {/* Day names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
              <div key={day} style={{ color: 'var(--text-subtle)', fontSize: 11, fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{day}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
            {calendarDays.map((day, index) => {
              const dayRenewals  = day ? renewalsByDay[day.toDateString()] || [] : [];
              const isToday      = day && startOfDay(day).getTime() === startOfDay(new Date()).getTime();
              const dayKey       = day?.toDateString();
              const showPreview  = dayKey && hoveredDay === dayKey && dayRenewals.length > 0;
              const hasRenewals  = dayRenewals.length > 0;

              return (
                <Motion.button
                  key={day?.toISOString() || `blank-${index}`}
                  type="button"
                  whileHover={day ? { y: -2 } : undefined}
                  onClick={() => dayRenewals[0] && setSelectedId(dayRenewals[0].id)}
                  onMouseEnter={() => dayKey && setHoveredDay(dayKey)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onFocus={() => dayKey && setHoveredDay(dayKey)}
                  onBlur={() => setHoveredDay(null)}
                  disabled={!day}
                  style={{
                    position: 'relative', minHeight: 80, textAlign: 'left', padding: 8,
                    borderRadius: 12,
                    background: !day ? 'transparent' : isToday ? 'var(--primary-soft)' : hasRenewals ? 'color-mix(in srgb, var(--surface-soft) 80%, transparent)' : 'var(--surface-soft)',
                    border: !day ? '1px solid transparent' : isToday ? '1.5px solid color-mix(in srgb, var(--primary) 40%, transparent)' : hasRenewals ? '1px solid color-mix(in srgb, var(--primary) 22%, var(--border))' : '1px solid var(--border)',
                    color: 'var(--text)',
                    cursor: day ? 'pointer' : 'default',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {day && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{
                          fontSize: 12, fontWeight: isToday ? 800 : 600,
                          color: isToday ? 'var(--primary)' : 'var(--text)',
                          width: 22, height: 22, borderRadius: '50%',
                          background: isToday ? 'var(--primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isToday ? '#fff' : 'var(--text)',
                        }}>
                          {day.getDate()}
                        </span>
                        {hasRenewals && (
                          <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 800, background: 'var(--primary-soft)', borderRadius: 999, padding: '1px 5px' }}>
                            {dayRenewals.length}
                          </span>
                        )}
                      </div>
                      {hasRenewals && (
                        <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
                          {dayRenewals.slice(0, 3).map(sub => (
                            <SubscriptionLogo key={sub.id} domain={sub.domain} name={sub.name} size={20} />
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'grid', gap: 3 }}>
                        {dayRenewals.slice(0, 1).map(sub => (
                          <span key={sub.id} style={{
                            display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            background: getUrgency(sub.nextRenewalDate).bg,
                            color: getUrgency(sub.nextRenewalDate).color,
                            borderRadius: 999, padding: '2px 6px', fontSize: 10, fontWeight: 800,
                          }}>
                            {sub.name}
                          </span>
                        ))}
                      </div>

                      {/* Hover tooltip */}
                      <AnimatePresence>
                        {showPreview && (
                          <Motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.94 }}
                            transition={{ duration: 0.16 }}
                            style={{
                              position: 'absolute', left: '50%', bottom: 'calc(100% + 10px)',
                              transform: 'translateX(-50%)', width: 240,
                              zIndex: 30,
                              background: 'var(--surface-raised)', border: '1px solid var(--border)',
                              borderRadius: 14, boxShadow: 'var(--shadow-strong)',
                              padding: 12, pointerEvents: 'none',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <strong style={{ fontSize: 13 }}>{formatDate(day)}</strong>
                              <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 800 }}>
                                {dayRenewals.length} renewal{dayRenewals.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            <div style={{ display: 'grid', gap: 8 }}>
                              {dayRenewals.slice(0, 3).map(sub => {
                                const urgency = getUrgency(sub.nextRenewalDate);
                                return (
                                  <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <SubscriptionLogo domain={sub.domain} name={sub.name} size={30} />
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <p style={{ fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</p>
                                      <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>Rs {sub.cost} · {cycleLabels[sub.billingCycle] || sub.billingCycle}</p>
                                    </div>
                                    <span style={{ background: urgency.bg, color: urgency.color, borderRadius: 999, padding: '3px 7px', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                                      {urgency.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </Motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </Motion.button>
              );
            })}
          </div>
        </Motion.section>

        {/* Detail panel */}
        <Motion.aside
          variants={fadeUp}
          style={{
            background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
            border: '1px solid var(--border)', borderRadius: 20, padding: 22,
            boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)',
          }}
        >
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Renewal Details</h2>
          {selected ? (
            <div>
              {/* Service identity */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18, padding: '14px', background: 'var(--surface-soft)', borderRadius: 14, border: '1px solid var(--border)' }}>
                <SubscriptionLogo domain={selected.domain} name={selected.name} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 800, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                    {selected.category?.name || 'Uncategorized'} · {cycleLabels[selected.billingCycle] || selected.billingCycle}
                  </p>
                </div>
                <span style={{
                  background: getUrgency(selected.nextRenewalDate).bg,
                  color: getUrgency(selected.nextRenewalDate).color,
                  borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800, flexShrink: 0,
                }}>
                  {getUrgency(selected.nextRenewalDate).label}
                </span>
              </div>

              {/* Detail rows */}
              {[
                ['Renewal Date',    formatDate(selected.nextRenewalDate)],
                ['Amount',          `Rs ${selected.cost}`],
                ['Monthly Impact',  `Rs ${getMonthlyCost(selected).toFixed(0)}`],
                ['Status',          selected.status],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', gap: 12,
                  padding: '12px 0', borderTop: '1px solid var(--border-soft)',
                  alignItems: 'center',
                }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
                  <strong style={{ fontSize: 13, textAlign: 'right', color: 'var(--text)' }}>{value}</strong>
                </div>
              ))}

              <Link
                to="/subscriptions"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  textAlign: 'center', background: 'var(--gradient-brand)', color: '#fff',
                  textDecoration: 'none', borderRadius: 12, padding: '11px 16px',
                  fontWeight: 700, fontSize: 14, marginTop: 18,
                  boxShadow: '0 6px 18px var(--primary-glow)',
                }}
              >
                <LinkIcon />Edit subscription
              </Link>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
              <p style={{ fontWeight: 700 }}>Select a day on the calendar</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>to see renewal details here.</p>
            </div>
          )}
        </Motion.aside>
      </div>

      {/* ══ Smart Timeline List ══ */}
      <Motion.section
        variants={fadeUp}
        style={{
          background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
          border: '1px solid var(--border)', borderRadius: 20, padding: 22,
          boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800 }}>Smart Timeline</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>All renewals sorted by urgency.</p>
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 180 }}>
            <option value="all">All renewals</option>
            <option value="week">Due this week</option>
            <option value="overdue">Overdue</option>
            <option value="weekly">Weekly billing</option>
            <option value="monthly">Monthly billing</option>
            <option value="yearly">Yearly billing</option>
          </select>
        </div>

        {filteredRenewals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 700 }}>No renewals match this filter.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {filteredRenewals.map(sub => {
              const urgency    = getUrgency(sub.nextRenewalDate);
              const isSelected = selected?.id === sub.id;

              return (
                <Motion.button
                  key={sub.id}
                  type="button"
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedId(sub.id)}
                  style={{
                    display: 'flex', gap: 14, alignItems: 'center',
                    textAlign: 'left',
                    background: isSelected ? 'var(--primary-soft)' : 'var(--surface-soft)',
                    color: 'var(--text)',
                    border: isSelected ? '1.5px solid color-mix(in srgb, var(--primary) 35%, transparent)' : '1px solid var(--border)',
                    borderRadius: 14, padding: '12px 14px',
                    transition: 'background 0.15s, border-color 0.15s',
                    boxShadow: isSelected ? '0 4px 16px var(--primary-glow)' : 'none',
                  }}
                >
                  <SubscriptionLogo domain={sub.domain} name={sub.name} size={36} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>
                      {formatDate(sub.nextRenewalDate)} · {cycleLabels[sub.billingCycle] || sub.billingCycle}
                    </p>
                  </div>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--primary)', fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: 15, flexShrink: 0 }}>
                    Rs {sub.cost}
                  </span>
                  <span style={{
                    background: urgency.bg, color: urgency.color,
                    borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 800, flexShrink: 0,
                  }}>
                    {urgency.label}
                  </span>
                </Motion.button>
              );
            })}
          </div>
        )}
      </Motion.section>

    </Motion.div>
  );
}
