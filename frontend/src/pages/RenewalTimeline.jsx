import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  show: { transition: { staggerChildren: 0.08 } },
};

const cycleLabels = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getDaysAway = (date) => {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const getUrgency = (date) => {
  const days = getDaysAway(date);
  if (days < 0) return { label: 'Overdue', color: '#ef4444', bg: '#fee2e2' };
  if (days === 0) return { label: 'Today', color: '#f59e0b', bg: '#fef3c7' };
  if (days <= 7) return { label: `${days} days`, color: '#6366f1', bg: '#ede9fe' };
  return { label: `${days} days`, color: '#10b981', bg: '#d1fae5' };
};

const getMonthlyCost = (sub) => {
  const cost = Number(sub.cost || 0);
  if (sub.billingCycle === 'yearly') return cost / 12;
  if (sub.billingCycle === 'weekly') return cost * 4;
  return cost;
};

const getCalendarDays = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = firstDay.getDay();

  return [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ];
};

const getLogoUrl = (domain) => {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};

const SubscriptionLogo = ({ domain, name, size = 28 }) => {
  const [error, setError] = useState(false);
  const initial = name?.[0]?.toUpperCase() || 'S';

  if (!domain || error) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: Math.max(8, size / 4),
        background: 'linear-gradient(135deg, #6366f1, #10b981)',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontSize: Math.max(11, size / 2.4),
        fontWeight: 850,
        flexShrink: 0,
      }}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={getLogoUrl(domain)}
      alt={name}
      onError={() => setError(true)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(8, size / 4),
        objectFit: 'contain',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: 2,
        flexShrink: 0,
      }}
    />
  );
};

export default function RenewalTimeline() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [hoveredDay, setHoveredDay] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await api.get('/subscriptions');
      setSubscriptions(res.data.subscriptions || []);
      setSelectedId(current => current || res.data.subscriptions?.[0]?.id || null);
    } catch {
      toast.error('Failed to load renewal timeline');
    } finally {
      setLoading(false);
    }
  };

  const activeSubscriptions = useMemo(
    () => subscriptions.filter(sub => sub.status !== 'cancelled'),
    [subscriptions]
  );

  const sortedRenewals = useMemo(() => {
    return [...activeSubscriptions].sort((a, b) =>
      new Date(a.nextRenewalDate) - new Date(b.nextRenewalDate)
    );
  }, [activeSubscriptions]);

  const filteredRenewals = useMemo(() => {
    if (filter === 'all') return sortedRenewals;
    if (filter === 'week') return sortedRenewals.filter(sub => {
      const days = getDaysAway(sub.nextRenewalDate);
      return days >= 0 && days <= 7;
    });
    if (filter === 'overdue') return sortedRenewals.filter(sub => getDaysAway(sub.nextRenewalDate) < 0);
    return sortedRenewals.filter(sub => sub.billingCycle === filter);
  }, [filter, sortedRenewals]);

  const selected = sortedRenewals.find(sub => sub.id === selectedId) || sortedRenewals[0];
  const calendarDays = getCalendarDays(viewDate);
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const renewalsByDay = useMemo(() => {
    return activeSubscriptions.reduce((acc, sub) => {
      const dateKey = new Date(sub.nextRenewalDate).toDateString();
      acc[dateKey] = [...(acc[dateKey] || []), sub];
      return acc;
    }, {});
  }, [activeSubscriptions]);

  const monthRenewals = activeSubscriptions.filter(sub => {
    const date = new Date(sub.nextRenewalDate);
    return date.getMonth() === viewDate.getMonth() && date.getFullYear() === viewDate.getFullYear();
  });

  const stats = [
    {
      label: 'Due This Month',
      value: monthRenewals.length,
      color: '#6366f1',
    },
    {
      label: 'Due This Week',
      value: activeSubscriptions.filter(sub => {
        const days = getDaysAway(sub.nextRenewalDate);
        return days >= 0 && days <= 7;
      }).length,
      color: '#f59e0b',
    },
    {
      label: 'Monthly Cashflow',
      value: `Rs ${activeSubscriptions.reduce((sum, sub) => sum + getMonthlyCost(sub), 0).toFixed(0)}`,
      color: '#10b981',
    },
    {
      label: 'Overdue',
      value: activeSubscriptions.filter(sub => getDaysAway(sub.nextRenewalDate) < 0).length,
      color: '#ef4444',
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '80vh' }}>
        <Motion.div
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          style={{ width: 280, height: 120, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}
        />
      </div>
    );
  }

  return (
    <Motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}
    >
      <Motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 850, lineHeight: 1.15 }}>Renewal Timeline</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.5, marginTop: 6 }}>
            Track upcoming renewals, overdue payments, and monthly cashflow.
          </p>
        </div>
        <Link
          to="/subscriptions"
          style={{
            background: '#6366f1',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 750,
          }}
        >
          Manage Subscriptions
        </Link>
      </Motion.div>

      <Motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        {stats.map(stat => (
          <Motion.div
            key={stat.label}
            variants={fadeUp}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 18,
              boxShadow: 'var(--shadow)',
              borderLeft: `4px solid ${stat.color}`,
            }}
          >
            <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 750, marginBottom: 8 }}>{stat.label}</p>
            <p style={{ color: stat.color, fontSize: 28, fontWeight: 850, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</p>
          </Motion.div>
        ))}
      </Motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18, alignItems: 'start' }}>
        <Motion.section variants={fadeUp} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 22,
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Calendar View</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{monthLabel}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                style={{ background: 'var(--surface-muted)', color: 'var(--text)', padding: '8px 10px' }}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setViewDate(new Date())}
                style={{ background: '#6366f1', color: '#fff', padding: '8px 10px' }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                style={{ background: 'var(--surface-muted)', color: 'var(--text)', padding: '8px 10px' }}
              >
                Next
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 800, textAlign: 'center' }}>{day}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
            {calendarDays.map((day, index) => {
              const dayRenewals = day ? renewalsByDay[day.toDateString()] || [] : [];
              const isToday = day && startOfDay(day).getTime() === startOfDay(new Date()).getTime();
              const dayKey = day?.toDateString();
              const showPreview = dayKey && hoveredDay === dayKey && dayRenewals.length > 0;
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
                    position: 'relative',
                    minHeight: 86,
                    textAlign: 'left',
                    padding: 10,
                    borderRadius: 12,
                    background: day ? (isToday ? 'var(--primary-soft)' : 'var(--surface-soft)') : 'transparent',
                    border: day ? '1px solid var(--border)' : '1px solid transparent',
                    color: 'var(--text)',
                    cursor: day ? 'pointer' : 'default',
                  }}
                >
                  {day && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{day.getDate()}</span>
                        {dayRenewals.length > 0 && (
                          <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 850 }}>{dayRenewals.length}</span>
                        )}
                      </div>
                      {dayRenewals.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                          {dayRenewals.slice(0, 4).map(sub => (
                            <SubscriptionLogo key={sub.id} domain={sub.domain} name={sub.name} size={22} />
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'grid', gap: 4 }}>
                        {dayRenewals.slice(0, 2).map(sub => (
                          <span
                            key={sub.id}
                            style={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              background: getUrgency(sub.nextRenewalDate).bg,
                              color: getUrgency(sub.nextRenewalDate).color,
                              borderRadius: 999,
                              padding: '3px 7px',
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {sub.name}
                          </span>
                        ))}
                      </div>
                      {showPreview && (
                        <Motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.16 }}
                          style={{
                            position: 'absolute',
                            left: '50%',
                            bottom: 'calc(100% + 10px)',
                            transform: 'translateX(-50%)',
                            width: 245,
                            zIndex: 20,
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 14,
                            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
                            padding: 12,
                            pointerEvents: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <strong style={{ fontSize: 13 }}>{formatDate(day)}</strong>
                            <span style={{ color: '#6366f1', fontSize: 12, fontWeight: 850 }}>
                              {dayRenewals.length} renewal{dayRenewals.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gap: 9 }}>
                            {dayRenewals.slice(0, 3).map(sub => {
                              const urgency = getUrgency(sub.nextRenewalDate);
                              return (
                                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <SubscriptionLogo domain={sub.domain} name={sub.name} size={34} />
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <p style={{ fontSize: 13, fontWeight: 850, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {sub.name}
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                                      Rs {sub.cost} - {cycleLabels[sub.billingCycle] || sub.billingCycle}
                                    </p>
                                  </div>
                                  <span style={{
                                    background: urgency.bg,
                                    color: urgency.color,
                                    borderRadius: 999,
                                    padding: '4px 7px',
                                    fontSize: 11,
                                    fontWeight: 850,
                                  }}>
                                    {urgency.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </Motion.div>
                      )}
                    </>
                  )}
                </Motion.button>
              );
            })}
          </div>
        </Motion.section>

        <Motion.aside variants={fadeUp} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 22,
          boxShadow: 'var(--shadow)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Renewal Details</h2>
          {selected ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 18 }}>
                <div>
                  <p style={{ fontSize: 22, fontWeight: 850, lineHeight: 1.2 }}>{selected.name}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                    {selected.category?.name || 'Uncategorized'} - {cycleLabels[selected.billingCycle] || selected.billingCycle}
                  </p>
                </div>
                <span style={{
                  background: getUrgency(selected.nextRenewalDate).bg,
                  color: getUrgency(selected.nextRenewalDate).color,
                  borderRadius: 999,
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 850,
                }}>
                  {getUrgency(selected.nextRenewalDate).label}
                </span>
              </div>
              {[
                ['Renewal Date', formatDate(selected.nextRenewalDate)],
                ['Amount', `Rs ${selected.cost}`],
                ['Monthly Impact', `Rs ${getMonthlyCost(selected).toFixed(0)}`],
                ['Status', selected.status],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border-soft)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
                  <strong style={{ fontSize: 13, textAlign: 'right' }}>{value}</strong>
                </div>
              ))}
              <Link
                to="/subscriptions"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: 'var(--surface-muted)',
                  color: 'var(--text)',
                  textDecoration: 'none',
                  borderRadius: 10,
                  padding: 12,
                  fontWeight: 800,
                  marginTop: 16,
                }}
              >
                Edit subscription
              </Link>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Add a subscription to see renewal details.</p>
          )}
        </Motion.aside>
      </div>

      <Motion.section variants={fadeUp} style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 22,
        boxShadow: 'var(--shadow)',
        marginTop: 18,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Smart Timeline</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Renewals sorted by urgency.</p>
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 170 }}>
            <option value="all">All renewals</option>
            <option value="week">Due this week</option>
            <option value="overdue">Overdue</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {filteredRenewals.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '20px 0' }}>No renewals match this filter.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {filteredRenewals.map(sub => {
              const urgency = getUrgency(sub.nextRenewalDate);
              return (
                <Motion.button
                  key={sub.id}
                  type="button"
                  whileHover={{ x: 4 }}
                  onClick={() => setSelectedId(sub.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                    gap: 12,
                    alignItems: 'center',
                    textAlign: 'left',
                    background: selected?.id === sub.id ? 'var(--primary-soft)' : 'var(--surface-soft)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 850, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>
                      {formatDate(sub.nextRenewalDate)} - {cycleLabels[sub.billingCycle] || sub.billingCycle}
                    </p>
                  </div>
                  <span style={{ color: '#6366f1', fontWeight: 850, fontVariantNumeric: 'tabular-nums' }}>Rs {sub.cost}</span>
                  <span style={{ background: urgency.bg, color: urgency.color, borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 850 }}>
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
